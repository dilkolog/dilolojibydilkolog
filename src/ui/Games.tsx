import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildExercise, displayForm, evaluateChoice, type ChoiceExercise } from '../engine/exercises'
import { comboMultiplier } from '../engine/gamification'
import { pickGameWords } from '../engine/practice'
import { newWordState, processAttempt } from '../engine/review'
import { createRng, pick, shuffle } from '../engine/rng'
import type { ExerciseType, TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { db, scheduler } from '../data/instance'
import { SAMPLE_WORDS } from '../data/seed'
import { FlameIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { sfx } from './sounds'

type Game = 'match' | 'blitz' | null

interface Props {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  onChanged: () => void
}

/** Games answers are stored as practice: they earn (reduced) XP but don't move the schedule. */
async function recordPractice(entry: VocabularyEntry, state: UserWordState | undefined, exerciseType: ExerciseType, correct: boolean, responseMs: number) {
  const result = processAttempt(
    state ?? newWordState(entry, new Date()),
    { exerciseType, verdict: correct ? 'correct' : 'wrong', responseMs, hintsUsed: 0, maxHints: 0, at: new Date(), mode: 'practice' },
    [],
    scheduler,
  )
  await db.events.add(result.event)
}

const fmt = (ms: number) => `${(ms / 1000).toFixed(1)} sn`

export function GamesScreen(p: Props) {
  const [game, setGame] = useState<Game>(null)
  const [records, setRecords] = useState<Record<string, number>>({})
  useEffect(() => {
    db.getRecords().then(setRecords)
  }, [game])

  const enough = p.vocabulary.length >= 4
  const matchKey = `match:${p.language}`
  const blitzKey = `blitz:${p.language}`

  if (game === 'match') return <MatchGame {...p} best={records[matchKey]} recordKey={matchKey} onExit={() => setGame(null)} />
  if (game === 'blitz') return <BlitzGame {...p} best={records[blitzKey]} recordKey={blitzKey} onExit={() => setGame(null)} />

  return (
    <div className="stack">
      <h1 className="greeting">Oyunlar</h1>
      <p className="greeting-sub">
        {LANGUAGE_NAME[p.language]} kelimelerinle hızlı turlar. Pratik sayılır: XP kazandırır ama tekrar takvimini değiştirmez.
      </p>
      {!enough && <p className="muted">Oyunlar için en az 4 kelime gerekiyor.</p>}
      <div className="game-cards">
        <button className="game-card" disabled={!enough} onClick={() => setGame('match')}>
          <span className="game-emoji">🧩</span>
          <strong>Eşleştirme</strong>
          <span className="small muted">6 kelimeyi anlamlarıyla en kısa sürede eşleştir. Yanlış eşleşme +1 saniye.</span>
          <span className="game-record">{records[matchKey] ? `Rekorun: ${fmt(records[matchKey])}` : 'Henüz rekor yok'}</span>
        </button>
        <button className="game-card" disabled={!enough} onClick={() => setGame('blitz')}>
          <span className="game-emoji">⚡</span>
          <strong>Zamana karşı</strong>
          <span className="small muted">60 saniyede olabildiğince çok doğru. Üst üste doğrular puanı katlar.</span>
          <span className="game-record">{records[blitzKey] ? `Rekorun: ${records[blitzKey]} puan` : 'Henüz rekor yok'}</span>
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

interface Tile {
  id: string
  entryId: string
  label: string
  side: 'word' | 'meaning'
}

const PAIRS = 6
const MISMATCH_PENALTY_MS = 1000

function MatchGame({ language, vocabulary, states, best, recordKey, onExit, onChanged }: Props & { best?: number; recordKey: string; onExit: () => void }) {
  const [round, setRound] = useState(0)
  const words = useMemo(() => pickGameWords(vocabulary, states, PAIRS, createRng(Date.now() + round)), [vocabulary, states, round])
  const tiles = useMemo<Tile[]>(
    () =>
      shuffle(
        words.flatMap((w) => [
          { id: `${w.id}:w`, entryId: w.id, label: displayForm(w), side: 'word' as const },
          { id: `${w.id}:m`, entryId: w.id, label: w.senses[0].gloss, side: 'meaning' as const },
        ]),
        createRng(Date.now() + round + 7),
      ),
    [words, round],
  )
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const [selected, setSelected] = useState<Tile | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<string[]>([])
  const [start, setStart] = useState<number | null>(null)
  const [penalty, setPenalty] = useState(0)
  const [now, setNow] = useState(0)
  const [done, setDone] = useState<{ ms: number; record: boolean } | null>(null)

  useEffect(() => {
    if (start === null || done) return
    const t = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(t)
  }, [start, done])

  const elapsed = start === null ? 0 : (done ? done.ms : now - start + penalty)

  const click = async (t: Tile) => {
    if (done || matched.has(t.entryId)) return
    const s = start ?? performance.now()
    if (start === null) setStart(s)
    if (!selected || selected.side === t.side) return setSelected(t)
    if (selected.entryId === t.entryId) {
      sfx.correct()
      const next = new Set(matched).add(t.entryId)
      setMatched(next)
      setSelected(null)
      const entry = vocabulary.find((v) => v.id === t.entryId)!
      void recordPractice(entry, stateById.get(entry.id), 'mc_meaning', true, 2000)
      if (next.size === words.length) {
        const ms = performance.now() - s + penalty
        const record = !best || ms < best
        if (record) await db.saveRecord(recordKey, Math.round(ms))
        setDone({ ms, record })
        sfx.levelUp()
        onChanged()
      }
    } else {
      sfx.wrong()
      setPenalty((x) => x + MISMATCH_PENALTY_MS)
      setWrong([selected.id, t.id])
      setSelected(null)
      setTimeout(() => setWrong([]), 400)
    }
  }

  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        <span className="game-timer">{fmt(elapsed)}</span>
        <span className="small muted">{best ? `Rekor: ${fmt(best)}` : ''}</span>
      </div>
      {done ? (
        <div className="celebrate stack">
          <h1>{done.record ? 'Yeni rekor! 🏆' : 'Tamamlandı!'}</h1>
          <p className="xp-gain">{fmt(done.ms)}</p>
          {penalty > 0 && <p className="muted">{penalty / 1000} saniyesi yanlış eşleşme cezası.</p>}
          <div className="row" style={{ justifyContent: 'center' }}>
            <button
              className="btn btn-lg"
              onClick={() => {
                setRound((r) => r + 1)
                setMatched(new Set())
                setStart(null)
                setPenalty(0)
                setDone(null)
              }}
              autoFocus
            >
              Tekrar oyna
            </button>
            <button className="btn btn-lg btn-quiet" onClick={onExit}>
              Çık
            </button>
          </div>
        </div>
      ) : (
        <div className="match-grid" lang={language}>
          {tiles.map((t) => (
            <button
              key={t.id}
              className={`match-tile ${t.side}${selected?.id === t.id ? ' is-selected' : ''}${matched.has(t.entryId) ? ' is-matched' : ''}${wrong.includes(t.id) ? ' is-wrong' : ''}`}
              onClick={() => click(t)}
              disabled={matched.has(t.entryId)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Blitz
// ---------------------------------------------------------------------------

const BLITZ_MS = 60_000

function BlitzGame({ language, vocabulary, states, best, recordKey, onExit, onChanged }: Props & { best?: number; recordKey: string; onExit: () => void }) {
  const pool = useMemo(() => {
    const own = new Set(vocabulary.map((v) => v.id))
    return [...vocabulary, ...SAMPLE_WORDS[language].filter((w) => !own.has(w.id))]
  }, [vocabulary, language])
  const words = useMemo(() => pickGameWords(vocabulary, states, 40, createRng(Date.now())), [vocabulary, states])
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const rng = useRef(createRng(Date.now()))
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [right, setRight] = useState(0)
  const [total, setTotal] = useState(0)
  const [ends, setEnds] = useState(0)
  const [now, setNow] = useState(0)
  const [flash, setFlash] = useState<{ id: string; ok: boolean; correctId: string } | null>(null)
  const [record, setRecord] = useState(false)
  const shownAt = useRef(0)

  const nextQuestion = useCallback((): { entry: VocabularyEntry; ex: ChoiceExercise } => {
    const entry = pick(words, rng.current)
    return { entry, ex: buildExercise('mc_meaning', entry, pool, rng.current) as ChoiceExercise }
  }, [words, pool])
  const [q, setQ] = useState(() => nextQuestion())

  const finished = useRef(false)
  const finish = useCallback(async () => {
    // The timer may tick again before React re-renders; end the round only once.
    if (finished.current) return
    finished.current = true
    setPhase('over')
    const isRecord = score > (best ?? 0)
    if (isRecord) await db.saveRecord(recordKey, score)
    setRecord(isRecord)
    sfx.levelUp()
    onChanged()
  }, [score, best, recordKey, onChanged])

  useEffect(() => {
    if (phase !== 'play') return
    const t = setInterval(() => {
      const n = performance.now()
      setNow(n)
      if (n >= ends) void finish()
    }, 100)
    return () => clearInterval(t)
  }, [phase, ends, finish])

  const answer = (optionId: string) => {
    if (phase !== 'play' || flash) return
    const ev = evaluateChoice(q.ex, optionId)
    const ok = ev.verdict === 'correct'
    void recordPractice(q.entry, stateById.get(q.entry.id), 'mc_meaning', ok, performance.now() - shownAt.current)
    setTotal((t) => t + 1)
    if (ok) {
      sfx.correct()
      setRight((r) => r + 1)
      setScore((s) => s + Math.round(10 * comboMultiplier(combo)))
      setCombo((c) => c + 1)
    } else {
      sfx.wrong()
      setCombo(0)
    }
    setFlash({ id: optionId, ok, correctId: q.ex.correctOptionId })
    setTimeout(
      () => {
        setFlash(null)
        setQ(nextQuestion())
        shownAt.current = performance.now()
      },
      ok ? 250 : 700,
    )
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        begin()
      }
      const i = Number(e.key) - 1
      if (phase === 'play' && i >= 0 && i < q.ex.options.length) answer(q.ex.options[i].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const begin = () => {
    setScore(0)
    setCombo(0)
    setRight(0)
    setTotal(0)
    setQ(nextQuestion())
    const n = performance.now()
    shownAt.current = n
    setNow(n)
    setEnds(n + BLITZ_MS)
    finished.current = false
    setPhase('play')
  }

  const left = Math.max(0, ends - now)

  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && <span className={`game-timer${left < 10_000 ? ' is-low' : ''}`}>{Math.ceil(left / 1000)} sn</span>}
        <span className="small muted">{best ? `Rekor: ${best} puan` : ''}</span>
      </div>

      {phase === 'ready' && (
        <div className="celebrate stack">
          <h1>60 saniye hazır mısın?</h1>
          <p className="muted">Kelimenin anlamını seç. 1–4 tuşları en hızlısı. Üst üste doğrular puanı katlar.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-lg" onClick={begin} autoFocus>
              Başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && (
        <>
          <div className="progress">
            <div style={{ width: `${(left / BLITZ_MS) * 100}%`, transition: 'width 0.1s linear' }} />
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="game-score">{score} puan</span>
            {combo >= 3 && (
              <span className="combo" key={combo}>
                <FlameIcon size={18} /> {combo}
              </span>
            )}
          </div>
          <h2 className="word" lang={language}>
            {displayForm(q.entry)}
          </h2>
          <div className="options">
            {q.ex.options.map((o, i) => (
              <button
                key={o.id}
                className={`option${flash && o.id === flash.correctId ? ' is-correct' : ''}${flash && !flash.ok && o.id === flash.id ? ' is-wrong' : ''}`}
                onClick={() => answer(o.id)}
              >
                <span className="key">{i + 1}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'over' && (
        <div className="celebrate stack">
          <h1>{record ? 'Yeni rekor! 🏆' : 'Süre doldu!'}</h1>
          <p className="xp-gain">{score} puan</p>
          <p className="muted">
            {total} sorudan {right} doğru{total ? ` (%${Math.round((right / total) * 100)})` : ''}.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-lg" onClick={begin} autoFocus>
              Tekrar oyna
            </button>
            <button className="btn btn-lg btn-quiet" onClick={onExit}>
              Çık
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
