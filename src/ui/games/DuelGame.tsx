import { useEffect, useMemo, useRef, useState } from 'react'
import { grammarExercises } from '../../data/grammar'
import { db } from '../../data/instance'
import { cleanRoomCode, newRoomCode, ROOM_INBOX } from '../../engine/liveDuel'
import { DUEL_INBOX, DUEL_ROUNDS, decodeDuel, duelLine, duelOptions, duelPool, duelQuestions, duelWinner, encodeDuel, pickDuelIds, type DuelChallenge, type DuelFilter, type DuelResult } from '../../engine/duel'
import { addRecord, byOpponent, cleanRecords, recordOf, tally, type DuelRecord } from '../../engine/duelHistory'
import { checkGrammar, filled, topicName } from '../../engine/grammar'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { DuelSide } from './duelParts'
import { share } from './shareLink'
import { LiveDuel } from './LiveDuel'
import { noteIn } from './logNote'

const NAME_KEY = 'diloloji:duel-name'
const HISTORY_KEY = 'diloloji:duel-history'
/** Fewest questions a narrowed duel may be made from. */
const MIN_POOL = 5
const LEVELS = ['B1', 'B2', 'C1'] as const

const storedHistory = (): DuelRecord[] => {
  try {
    return cleanRecords(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'))
  } catch {
    return []
  }
}

const note = noteIn(() => db.getGrammarLog(), (log) => db.saveGrammarLog(log))

const storedName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

const linkOf = (c: DuelChallenge) => `${location.origin}/?duel=${encodeDuel(c)}`

type Phase = 'lobby' | 'play' | 'over'

/**
 * A duel with a friend, over a link (see engine/duel.ts): ten grammar questions, the same for both,
 * scored by right answers and then by speed. Start one and send the link, or open the one you were sent.
 */
export function DuelGame({ language, onExit }: { language: TargetLanguage; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [name, setName] = useState(storedName)
  const [paste, setPaste] = useState('')
  // A live room (the code), played at the same time with a friend; null: the duel by link.
  const [liveCode, setLiveCode] = useState<string | null>(null)
  const [roomPaste, setRoomPaste] = useState('')
  const [problem, setProblem] = useState('')
  // The challenge being played (or looked at): mine to send, or one I was sent.
  const [challenge, setChallenge] = useState<DuelChallenge | null>(null)
  const [mine, setMine] = useState(true)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [right, setRight] = useState(0)
  const [spent, setSpent] = useState(0)
  const [final, setFinal] = useState<DuelResult | null>(null)
  const [filter, setFilter] = useState<DuelFilter>({})
  const [history, setHistory] = useState<DuelRecord[]>(storedHistory)
  const shown = useRef(0)
  const pool = useMemo(() => grammarExercises(challenge?.language ?? language), [challenge, language])
  const questions = useMemo(() => (challenge ? duelQuestions(challenge, pool) : []), [challenge, pool])
  const q = questions[index]
  const player = name.trim() || 'Ben'
  const ownPool = useMemo(() => grammarExercises(language), [language])
  const topics = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of duelPool(ownPool)) counts.set(e.topic, (counts.get(e.topic) ?? 0) + 1)
    return [...counts].filter(([, n]) => n >= MIN_POOL).map(([topic]) => topic).sort((a, b) => topicName(a).localeCompare(topicName(b), 'tr'))
  }, [ownPool])
  const narrowed = duelPool(ownPool, filter).length

  const remember = (n: string) => {
    setName(n)
    try {
      localStorage.setItem(NAME_KEY, n)
    } catch {
      // Not remembered; fine.
    }
  }

  const open = (code: string) => {
    const c = decodeDuel(code)
    if (!c) {
      setProblem('Bu bir düello bağlantısı gibi görünmüyor. Arkadaşından gelen bağlantıyı ya da kodu olduğu gibi yapıştır.')
      return
    }
    setProblem('')
    setChallenge(c)
    setMine(false)
    // A reply came back to the challenger: nothing to play, the two results are the page.
    if (c.reply) {
      setFinal(c.reply)
      setPhase('over')
    }
  }

  // A link opened in the app waits in the inbox (a duel by link, or a live room).
  useEffect(() => {
    try {
      const room = cleanRoomCode(sessionStorage.getItem(ROOM_INBOX))
      sessionStorage.removeItem(ROOM_INBOX)
      if (room) {
        setLiveCode(room)
        return
      }
      const code = sessionStorage.getItem(DUEL_INBOX)
      if (!code) return
      sessionStorage.removeItem(DUEL_INBOX)
      open(code)
    } catch {
      // No session storage: the code can be pasted.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const begin = (c: DuelChallenge, mineNow: boolean) => {
    setChallenge(c)
    setMine(mineNow)
    setIndex(0)
    setPicked(null)
    setRight(0)
    setSpent(0)
    setFinal(null)
    shown.current = Date.now()
    setPhase('play')
  }

  const startNew = () => {
    const ids = pickDuelIds(ownPool, createRng(Date.now()), DUEL_ROUNDS, filter)
    if (ids.length < MIN_POOL) return
    // The score is filled in when it is played; the link is made at the end.
    begin({ language, ids, from: { name: player, score: 0, ms: 0 } }, true)
  }

  const answer = (option: string) => {
    if (!q || picked !== null) return
    const ok = checkGrammar(q, option) !== 'wrong'
    setPicked(option)
    setSpent((s) => s + (Date.now() - shown.current))
    if (ok) setRight((r) => r + 1)
    if (ok) sfx.correct()
    else sfx.wrong()
    void note(q.id, ok)
  }

  const next = () => {
    if (!challenge) return
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      setPicked(null)
      shown.current = Date.now()
      return
    }
    const result: DuelResult = { name: player, score: right, ms: spent }
    setFinal(result)
    sfx.levelUp()
    setPhase('over')
  }

  useEffect(() => {
    if (phase !== 'play') return
    const onKey = (e: KeyboardEvent) => {
      if (picked !== null && e.key === 'Enter') {
        e.preventDefault()
        next()
      } else if (picked === null && q?.options && /^[1-9]$/.test(e.key)) {
        const option = duelOptions(q)[Number(e.key) - 1]
        if (option) answer(option)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const total = questions.length || DUEL_ROUNDS

  // What goes in the link: my own challenge with my score, or the one I was sent with my result as the reply.
  const outgoing: DuelChallenge | null = challenge && final ? (mine ? { ...challenge, from: final } : { ...challenge, reply: final }) : null
  const opponent: DuelResult | null = challenge && !mine ? challenge.from : null

  // A duel played against a friend (or a friend's answer opened) is written in the history, once.
  useEffect(() => {
    if (phase !== 'over' || !challenge || mine) return
    const record = challenge.reply ? recordOf(challenge, challenge.from, challenge.reply, new Date()) : final ? recordOf(challenge, final, challenge.from, new Date()) : null
    if (!record) return
    setHistory((cur) => {
      const next = addRecord(cur, record)
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      } catch {
        // Not remembered; fine.
      }
      return next
    })
  }, [phase, challenge, final, mine])

  if (liveCode) return <LiveDuel language={language} name={player} code={liveCode} onExit={() => setLiveCode(null)} />

  return (
    <div className="stack duel-game">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {total}
          </span>
        )}
        <span className="small muted" />
      </div>

      {phase === 'lobby' && (
        <div className="stack">
          <h1 className="greeting">Arkadaşla düello</h1>
          <p className="muted">
            Aynı {DUEL_ROUNDS} dilbilgisi sorusunu ikiniz de kendi zamanınızda çözersiniz; çok doğru yapan kazanır, eşitlikte hızlı olan. Sonuç bir bağlantıyla gider gelir, hesap gerekmez.
          </p>
          <label className="stack">
            <span className="small muted">Düelloda görünecek adın</span>
            <input className="input" value={name} maxLength={24} onChange={(e) => remember(e.target.value)} placeholder="Adın" aria-label="Adın" autoComplete="off" />
          </label>
          <div className="stack duel-filter">
            <label className="stack">
              <span className="small muted">Konu</span>
              <select className="input" value={filter.topic ?? ''} onChange={(e) => setFilter((f) => ({ ...f, topic: e.target.value || undefined }))} aria-label="Düello konusu">
                <option value="">Karışık</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {topicName(t)}
                  </option>
                ))}
              </select>
            </label>
            <div className="choice-row" role="group" aria-label="Seviye">
              <button type="button" className="chip chip-sm" aria-pressed={!filter.level} onClick={() => setFilter((f) => ({ ...f, level: undefined }))}>
                Her seviye
              </button>
              {LEVELS.map((l) => (
                <button key={l} type="button" className="chip chip-sm" aria-pressed={filter.level === l} onClick={() => setFilter((f) => ({ ...f, level: l }))}>
                  {l}
                </button>
              ))}
            </div>
            {narrowed < MIN_POOL && <p className="small notice">Bu seçimde yeterli soru yok; konuyu ya da seviyeyi genişlet.</p>}
          </div>
          <div className="row">
            <button className="btn btn-lg" onClick={startNew} disabled={narrowed < MIN_POOL}>
              {LANGUAGE_NAME[language]} düellosu başlat
            </button>
          </div>
          <section className="card stack live-lobby" aria-label="Canlı düello">
            <h2 className="section-title">Canlı düello</h2>
            <p className="small muted">Arkadaşınla aynı anda, ayrı telefonlarda: aynı sorular, birbirinizin ilerleyişini görürsünüz. Bir oda kur, kodu ya da bağlantıyı gönder.</p>
            <div className="row">
              <button className="btn btn-sm" onClick={() => setLiveCode(newRoomCode())}>
                Oda kur
              </button>
            </div>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault()
                const code = cleanRoomCode(roomPaste.replace(/^.*[?&]oda=/, ''))
                if (code) setLiveCode(code)
                else setProblem('Oda kodu 6 harf ve rakamdan oluşur (örn. K7M-P9R).')
              }}
            >
              <input className="input" value={roomPaste} onChange={(e) => setRoomPaste(e.target.value)} placeholder="Oda kodu ya da bağlantı" aria-label="Oda kodu" autoComplete="off" autoCapitalize="characters" />
              <button className="btn btn-sm btn-quiet" type="submit" disabled={!roomPaste.trim()}>
                Odaya katıl
              </button>
            </form>
          </section>
          {history.length > 0 && <DuelHistory history={history} />}
          <section className="card stack duel-open">
            <h2 className="section-title">Gelen düelloyu aç</h2>
            <p className="small muted">Arkadaşının gönderdiği bağlantıyı ya da kodu yapıştır. (Bağlantıya dokunursan zaten doğrudan açılır.)</p>
            <textarea className="input" rows={2} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="https://…/?duel=…" aria-label="Düello bağlantısı" />
            {problem && (
              <p className="error" role="alert">
                {problem}
              </p>
            )}
            <div className="row">
              <button className="btn btn-sm" disabled={!paste.trim()} onClick={() => open(paste)}>
                Aç
              </button>
            </div>
          </section>
          {challenge && !mine && phase === 'lobby' && (
            <section className="card stack duel-invite" role="status">
              <strong lang="tr">
                {challenge.from.name}, {LANGUAGE_NAME[challenge.language]} düellosuna seni çağırıyor
              </strong>
              <p className="small muted">{questions.length} soru. Onun sonucu, sen bitirince görünür.</p>
              <div className="row">
                <button className="btn" onClick={() => begin(challenge, false)} autoFocus disabled={questions.length === 0}>
                  Düelloya başla
                </button>
              </div>
              {questions.length === 0 && <p className="small notice">Bu düellonun soruları bu sürümde yok; uygulamayı güncelleyip tekrar dene.</p>}
            </section>
          )}
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack">
          <p className="prompt-label">
            {topicName(q.topic)} · {q.level}
          </p>
          <p className="grammar-sentence" lang={challenge!.language}>
            {q.prompt.split('___').map((part, i, parts) => (
              <span key={i}>
                {part}
                {i < parts.length - 1 && <span className="blank">____</span>}
              </span>
            ))}
          </p>
          {q.hint && picked === null && <p className="small muted">İpucu: {q.hint}</p>}
          <div className="options">
            {duelOptions(q).map((o, i) => (
              <button
                key={o}
                type="button"
                className={`option${picked !== null ? (checkGrammar(q, o) !== 'wrong' ? ' is-correct' : picked === o ? ' is-wrong' : ' is-dim') : ''}`}
                disabled={picked !== null}
                onClick={() => answer(o)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif" lang={challenge!.language}>
                  {o}
                </span>
              </button>
            ))}
          </div>
          {picked !== null && (
            <div className="stack grammar-feedback" role="status">
              <p className={checkGrammar(q, picked) === 'wrong' ? 'cross-warn' : 'small'}>
                <strong>{checkGrammar(q, picked) === 'wrong' ? 'Olmadı.' : 'Doğru!'}</strong> <span lang={challenge!.language}>{filled(q, q.answer)}</span>
              </p>
              <p className="small">{q.explanation}</p>
              <div className="row">
                <button type="button" className="btn" onClick={next} autoFocus>
                  {index + 1 < questions.length ? 'Devam' : 'Sonucu gör'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'over' && challenge && final && (
        <div className="stack duel-result">
          <h1 className="greeting">{mine ? 'Düello hazır' : duelTitle(challenge, final, opponent)}</h1>
          <div className="duel-board" role="group" aria-label="Sonuçlar">
            {mine ? (
              <DuelSide result={final} of={total} you />
            ) : challenge.reply ? (
              <>
                <DuelSide result={challenge.from} of={total} winner={duelWinner(challenge.from, challenge.reply) === 'from'} />
                <DuelSide result={challenge.reply} of={total} winner={duelWinner(challenge.from, challenge.reply) === 'reply'} />
              </>
            ) : (
              <>
                <DuelSide result={challenge.from} of={total} winner={duelWinner(challenge.from, final) === 'from'} />
                <DuelSide result={final} of={total} you winner={duelWinner(challenge.from, final) === 'reply'} />
              </>
            )}
          </div>
          {outgoing && !challenge.reply && (
            <>
              <p className="muted">
                {mine ? 'Bağlantıyı arkadaşına gönder; o çözünce sonucu sana bir bağlantıyla geri yollar.' : `${challenge.from.name} sonucunu görmek için bağlantıyı ona gönder.`}
              </p>
              <div className="row">
                <button
                  className="btn btn-lg"
                  onClick={() =>
                    void share(
                      mine
                        ? `Seninle ${LANGUAGE_NAME[challenge.language]} düellosu yapalım! Ben ${duelLine(final, total)} yaptım.`
                        : `Düelloyu çözdüm: ${duelLine(final, total)}. Sonuçlara bak!`,
                      linkOf(outgoing),
                    )
                  }
                >
                  {mine ? 'Arkadaşına gönder' : 'Sonucumu gönder'}
                </button>
              </div>
              <p className="small muted duel-link" lang="en">
                {linkOf(outgoing)}
              </p>
            </>
          )}
          <div className="row">
            <button className="btn btn-sm btn-quiet" onClick={() => (setPhase('lobby'), setChallenge(null), setFinal(null), setMine(true))}>
              {challenge.reply ? 'Rövanş başlat' : 'Yeni düello'}
            </button>
            <button className="btn btn-sm btn-quiet" onClick={onExit}>
              Oyunlara dön
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function duelTitle(challenge: DuelChallenge, mine: DuelResult, opponent: DuelResult | null): string {
  if (challenge.reply) {
    const w = duelWinner(challenge.from, challenge.reply)
    return w === 'tie' ? 'Berabere!' : `${w === 'from' ? challenge.from.name : challenge.reply.name} kazandı`
  }
  const w = opponent ? duelWinner(opponent, mine) : 'tie'
  return w === 'tie' ? 'Berabere!' : w === 'reply' ? 'Kazandın!' : `${opponent!.name} kazandı`
}

function DuelHistory({ history }: { history: DuelRecord[] }) {
  const total = tally(history)
  const people = byOpponent(history).slice(0, 5)
  const word = { win: 'kazandın', loss: 'kaybettin', tie: 'berabere' } as const
  return (
    <section className="card stack duel-history" aria-label="Düello geçmişi">
      <h2 className="section-title">Düello geçmişin</h2>
      <p>
        <strong>{total.wins}</strong> galibiyet · <strong>{total.losses}</strong> mağlubiyet · <strong>{total.ties}</strong> beraberlik
      </p>
      <ul className="plain stack gap-2">
        {people.map((p) => (
          <li key={p.opponent} className="small">
            <strong>{p.opponent}</strong>: {p.tally.wins}-{p.tally.losses}
            {p.tally.ties > 0 ? `-${p.tally.ties}` : ''} <span className="muted">({p.duels} düello)</span>
          </li>
        ))}
      </ul>
      <p className="small muted">
        Son düello: {history[0].opponent} ile {history[0].mine}-{history[0].theirs}, {word[history[0].outcome]}. Geçmiş yalnızca bu cihazda durur.
      </p>
    </section>
  )
}
