import { useEffect, useMemo, useRef, useState } from 'react'
import { grammarExercises } from '../../data/grammar'
import { db } from '../../data/instance'
import { DUEL_ROUNDS, duelOptions, duelQuestions, pickDuelIds, type DuelFilter } from '../../engine/duel'
import { checkGrammar, filled, topicName } from '../../engine/grammar'
import { roomLink, type RoomView, type SeriesView } from '../../engine/liveDuel'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { duelComment } from '../../engine/duelComment'
import { MonkiVerdict } from '../monki/MonkiVerdict'
import { DuelSide } from './duelParts'
import { noteIn } from './logNote'
import { share } from './shareLink'
import { useLiveRoom } from './useLiveRoom'

const LEVELS = ['B1', 'B2', 'C1'] as const
const note = noteIn(() => db.getGrammarLog(), (log) => db.saveGrammarLog(log))

/** A room code as it is shown and read aloud: ABC-234. */
const showRoom = (code: string) => `${code.slice(0, 3)}-${code.slice(3)}`

/**
 * A live duel (see engine/liveDuel.ts): both players in one room, the same questions at the same time, each seeing how
 * far the other is; the scores are shown when both are done. The host (who made the room) picks the questions and starts.
 */
export function LiveDuel({ language, name, code, onExit }: { language: TargetLanguage; name: string; code: string; onExit: () => void }) {
  const { room, status, error, send } = useLiveRoom(code, name)
  const [filter, setFilter] = useState<DuelFilter>({})
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  // The player has seen the last question through (so the result may replace it).
  const [finished, setFinished] = useState(false)
  const shown = useRef(Date.now())
  const sent = useRef(0)

  // The questions of the game that is on, from the language the host chose.
  const pool = useMemo(() => grammarExercises(room?.language ?? language), [room?.language, language])
  const ids = room?.ids.join(',') ?? ''
  const questions = useMemo(() => (room ? duelQuestions({ language: room.language ?? language, ids: room.ids, from: { name: '', score: 0, ms: 0 } }, pool) : []), [room, pool, language])
  const q = questions[index]
  const playing = room?.phase === 'playing'
  // The friend finished first and the player's last answer ended the game: its explanation stays until they go on.
  const holdLast = room?.phase === 'over' && !finished && picked !== null && !!q

  // A new game starts at the first question.
  useEffect(() => {
    if (!playing) return
    setIndex(0)
    setPicked(null)
    setFinished(false)
    shown.current = Date.now()
    sent.current = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, ids])

  const answer = (option: string) => {
    if (!q || picked !== null || !playing) return
    const ok = checkGrammar(q, option) !== 'wrong'
    setPicked(option)
    if (ok) sfx.correct()
    else sfx.wrong()
    void note(q.id, ok)
    send({ t: 'answer', i: sent.current++, ok, ms: Date.now() - shown.current })
  }

  // A question this version does not have is answered as missed, so both players still finish together.
  useEffect(() => {
    if (!playing || !room) return
    const missing = room.ids.length - questions.length
    if (missing > 0 && index >= questions.length && sent.current < room.ids.length) {
      while (sent.current < room.ids.length) send({ t: 'answer', i: sent.current++, ok: false, ms: 0 })
    }
  }, [playing, room, questions.length, index, send])

  const next = () => {
    if (index + 1 >= questions.length) setFinished(true)
    setIndex((i) => i + 1)
    setPicked(null)
    shown.current = Date.now()
  }

  useEffect(() => {
    if (!playing) return
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

  const startGame = () => {
    const picks = pickDuelIds(grammarExercises(language), createRng(Date.now()), DUEL_ROUNDS, filter)
    send({ t: 'start', language, ids: picks })
  }

  const total = room?.ids.length ?? DUEL_ROUNDS
  const other = room?.players.find((_, i) => i !== room.you)
  const me = room?.players[room.you]

  return (
    <div className="stack duel-game live-duel">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Düelloya dön
        </button>
        {playing && me && (
          <span className="game-timer">
            {Math.min(index + 1, total)} / {total}
          </span>
        )}
        <span className="small muted" />
      </div>

      {status === 'lost' && (
        <section className="card stack" role="alert">
          <strong>{error === 'full' ? 'Bu oda dolu.' : 'Odaya bağlanılamadı.'}</strong>
          <p className="small muted">{error === 'full' ? 'Odada iki kişi var; arkadaşından yeni bir oda kurmasını iste.' : 'İnternet bağlantını kontrol edip tekrar dene.'}</p>
          <div className="row">
            <button className="btn btn-sm" onClick={onExit}>
              Geri dön
            </button>
          </div>
        </section>
      )}

      {status !== 'lost' && !room && <p className="muted" role="status">{status === 'connecting' ? 'Odaya bağlanılıyor…' : 'Odaya girildi…'}</p>}

      {status !== 'lost' && room && room.phase === 'lobby' && (
        <div className="stack">
          <h1 className="greeting">Canlı düello odası</h1>
          <div className="card stack live-room-card">
            <span className="small muted">Oda kodu</span>
            <strong className="live-room-code" lang="en">
              {showRoom(code)}
            </strong>
            <p className="small muted duel-link" lang="en">
              {roomLink(code, location.origin)}
            </p>
            <div className="row">
              <button className="btn btn-sm" onClick={() => void share(`Canlı düelloya gel! Oda kodu: ${showRoom(code)}`, roomLink(code, location.origin))}>
                Arkadaşını çağır
              </button>
            </div>
          </div>
          <ul className="plain stack gap-2" aria-label="Odadakiler">
            {room.players.map((p, i) => (
              <li key={i} className="row gap-2">
                <strong>{i === room.you ? `${p.name} (sen)` : p.name}</strong>
                <span className="small muted">{i === 0 ? 'oda sahibi' : ''}</span>
                <span className={`small ${p.connected ? '' : 'muted'}`}>{p.connected ? '● bağlı' : '○ ayrıldı'}</span>
              </li>
            ))}
            {room.players.length < 2 && <li className="small muted">Arkadaşın bekleniyor…</li>}
          </ul>
          {room.you === 0 ? (
            <div className="stack">
              <div className="choice-row" role="group" aria-label="Seviye">
                <button type="button" className="chip chip-sm" aria-pressed={!filter.level} onClick={() => setFilter({})}>
                  Her seviye
                </button>
                {LEVELS.map((l) => (
                  <button key={l} type="button" className="chip chip-sm" aria-pressed={filter.level === l} onClick={() => setFilter({ level: l })}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="row">
                <button className="btn btn-lg" onClick={startGame} disabled={room.players.length < 2 || !room.players.every((p) => p.connected)}>
                  {LANGUAGE_NAME[language]} düellosunu başlat
                </button>
              </div>
              {error === 'need_two' && <p className="small notice">İki kişi de odada olmalı.</p>}
            </div>
          ) : (
            <p className="muted" role="status">
              Oda sahibi başlatınca sorular ikinize de açılır.
            </p>
          )}
        </div>
      )}

      {status !== 'lost' && room && (playing || holdLast) && (
        <div className="stack">
          {other && (
            <p className="small muted live-progress" role="status" aria-live="polite">
              {other.name}: {other.answered}/{total} soruda{other.connected ? '' : ' (bağlantısı koptu)'}
            </p>
          )}
          {q ? (
            <>
              <p className="prompt-label">
                {topicName(q.topic)} · {q.level}
              </p>
              <p className="grammar-sentence" lang={room.language}>
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
                    <span className="option-serif" lang={room.language}>
                      {o}
                    </span>
                  </button>
                ))}
              </div>
              {picked !== null && (
                <div className="stack grammar-feedback" role="status">
                  <p className={checkGrammar(q, picked) === 'wrong' ? 'cross-warn' : 'small'}>
                    <strong>{checkGrammar(q, picked) === 'wrong' ? 'Olmadı.' : 'Doğru!'}</strong> <span lang={room.language}>{filled(q, q.answer)}</span>
                  </p>
                  <p className="small">{q.explanation}</p>
                  <div className="row">
                    <button type="button" className="btn" onClick={next} autoFocus>
                      {index + 1 < questions.length ? 'Devam' : 'Bitir'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="muted" role="status">
              Bitirdin. {other?.name ?? 'Arkadaşının'} bitirmesi bekleniyor…
            </p>
          )}
        </div>
      )}

      {status !== 'lost' && room && room.phase === 'over' && !holdLast && me && <LiveResult room={room} total={total} onAgain={() => send({ t: 'again' })} onExit={onExit} />}
    </div>
  )
}

function LiveResult({ room, total, onAgain, onExit }: { room: RoomView; total: number; onAgain: () => void; onExit: () => void }) {
  const result = (i: number) => ({ name: room.players[i].name, score: room.players[i].score ?? 0, ms: room.players[i].ms ?? 0 })
  const title = room.winner === 'tie' ? 'Berabere!' : room.winner === 'you' ? 'Kazandın!' : `${room.players.find((_, i) => i !== room.you)?.name ?? 'Arkadaşın'} kazandı`
  const mine = room.you
  useEffect(() => {
    sfx.levelUp()
  }, [])
  return (
    <div className="stack duel-result">
      <h1 className="greeting">{title}</h1>
      <div className="duel-board" role="group" aria-label="Sonuçlar">
        <DuelSide result={result(mine)} of={total} you winner={room.winner === 'you'} />
        <DuelSide result={result(1 - mine)} of={total} winner={room.winner === 'them'} />
      </div>
      <MonkiVerdict comment={duelComment(result(mine), result(1 - mine), total, room.winner === 'tie' ? null : room.winner === 'you', room.players[1 - mine]?.name ?? 'Arkadaşın')} />
      {room.series && <SeriesBoard series={room.series} them={room.players[1 - mine]?.name ?? 'Arkadaşın'} />}
      <div className="row">
        <button className="btn btn-sm" onClick={onAgain}>
          {room.series && room.series.games < room.series.of ? 'Rövanş' : room.series ? 'Yeni seri' : 'Tekrar oyna'}
        </button>
        <button className="btn btn-sm btn-quiet" onClick={onExit}>
          Çık
        </button>
      </div>
    </div>
  )
}

/** The rematch series: games won on each side, ties, and right answers over the series; its winner once it is played out. */
function SeriesBoard({ series, them }: { series: SeriesView; them: string }) {
  const done = series.games >= series.of
  const head = !done
    ? `Rövanş serisi: ${series.games}/${series.of}. düello`
    : series.winner === 'you'
      ? 'Seriyi sen kazandın!'
      : series.winner === 'them'
        ? `Seriyi ${them} kazandı`
        : 'Seri berabere bitti'
  return (
    <section className="card duel-series" aria-label="Rövanş serisi">
      <p className="section-title">{head}</p>
      <table className="duel-series-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Oyuncu</span>
            </th>
            <th scope="col">Galibiyet</th>
            <th scope="col">Doğru</th>
          </tr>
        </thead>
        <tbody>
          <tr className={series.winner === 'you' ? 'duel-series-lead' : undefined}>
            <th scope="row">Sen</th>
            <td>{series.you}</td>
            <td>{series.right.you}</td>
          </tr>
          <tr className={series.winner === 'them' ? 'duel-series-lead' : undefined}>
            <th scope="row">{them}</th>
            <td>{series.them}</td>
            <td>{series.right.them}</td>
          </tr>
        </tbody>
      </table>
      {series.ties > 0 && <p className="small muted">{series.ties} düello berabere.</p>}
      {done && <p className="small muted">Galibiyet eşitse toplam doğru sayısı karar verir.</p>}
    </section>
  )
}
