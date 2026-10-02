import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildExercise, displayForm, evaluateChoice, pickDistractors, type ChoiceExercise } from '../engine/exercises'
import { comboMultiplier } from '../engine/gamification'
import { pairRound, type PairQuestion } from '../engine/listening'
import { FLUENCY_MIN_WORDS, median, pickFluencyWords, pickGameWords } from '../engine/practice'
import { newWordState, processAttempt } from '../engine/review'
import { createRng, pick, shuffle } from '../engine/rng'
import type { ExerciseType, Mistake, TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { GENDER_RULES, ruleQuiz, troubleRules, type RuleQuestion } from '../engine/genderRules'
import { db, scheduler } from '../data/instance'
import { SAMPLE_WORDS } from '../data/seed'
import { FlameIcon, SpeakerIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { sfx } from './sounds'
import { canSpeak, speak, speakAsync } from './speech'

type Game = 'match' | 'blitz' | 'fluency' | 'pairs' | 'gender' | null

interface Props {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes?: Mistake[]
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

const FLUENCY_ROUND = 20
/** Below this accuracy a fast time is guessing, not fluency, so it can't set a record. */
const FLUENCY_MIN_ACCURACY = 0.85

const fmt = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} sn`

export function GamesScreen(p: Props) {
  const [game, setGame] = useState<Game>(null)
  const [records, setRecords] = useState<Record<string, number>>({})
  useEffect(() => {
    db.getRecords().then(setRecords)
  }, [game])

  const enough = p.vocabulary.length >= 4
  const matchKey = `match:${p.language}`
  const blitzKey = `blitz:${p.language}`
  const fluencyKey = `fluency:${p.language}`
  const fluencyWords = pickFluencyWords(p.vocabulary, p.states, createRng(1)).length

  if (game === 'match') return <MatchGame {...p} best={records[matchKey]} recordKey={matchKey} onExit={() => setGame(null)} />
  if (game === 'gender' && p.language !== 'en')
    return <GenderGame {...p} language={p.language} best={records[`gender:${p.language}`]} recordKey={`gender:${p.language}`} onExit={() => setGame(null)} />
  if (game === 'pairs') return <PairsGame {...p} best={records[`pairs:${p.language}`]} recordKey={`pairs:${p.language}`} onExit={() => setGame(null)} />
  if (game === 'fluency')
    return <FluencyGame {...p} best={records[fluencyKey]} last={records[`${fluencyKey}:last`]} recordKey={fluencyKey} onExit={() => setGame(null)} />
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
        {p.language !== 'en' && (
          <button className="game-card" onClick={() => setGame('gender')}>
            <span className="game-emoji">⚖️</span>
            <strong>Cinsiyet kuralları</strong>
            <span className="small muted">Kelimenin sonu çoğu zaman artikelini söyler (-tion → la, -age → le). Kuralları ve en çok takılınan istisnaları çalış.</span>
            <span className="game-record">{records[`gender:${p.language}`] ? `Rekorun: %${records[`gender:${p.language}`]}` : 'Henüz rekor yok'}</span>
          </button>
        )}
        <button className="game-card" disabled={!canSpeak()} onClick={() => setGame('pairs')}>
          <span className="game-emoji">👂</span>
          <strong>Ses ayırt etme</strong>
          <span className="small muted">Tek sesi farklı iki kelimeden hangisini duydun? Türkçede olmayan ses farklarını kulağın ayırt etmeyi öğrenir.</span>
          <span className="game-record">{records[`pairs:${p.language}`] ? `Rekorun: %${records[`pairs:${p.language}`]}` : canSpeak() ? 'Henüz rekor yok' : 'Bu tarayıcıda sesli okuma yok'}</span>
        </button>
        <button className="game-card" disabled={fluencyWords < FLUENCY_MIN_WORDS} onClick={() => setGame('fluency')}>
          <span className="game-emoji">🏎️</span>
          <strong>Akıcılık turu</strong>
          <span className="small muted">İyi bildiğin kelimelerle {FLUENCY_ROUND} soru: Türkçesini gör, kelimeyi anında bul. Amaç öğrenmek değil, düşünmeden hatırlamak.</span>
          <span className="game-record">
            {fluencyWords < FLUENCY_MIN_WORDS
              ? `İyi bildiğin en az ${FLUENCY_MIN_WORDS} kelime gerekiyor (şu an ${fluencyWords})`
              : records[fluencyKey]
                ? `Rekorun: soru başına ${fmt(records[fluencyKey])}`
                : 'Henüz rekor yok'}
          </span>
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
  const [q, setQ] = useState<{ entry: VocabularyEntry; ex: ChoiceExercise } | null>(null)

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
    if (phase !== 'play' || flash || !q) return
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        begin()
      }
      const i = Number(e.key) - 1
      if (phase === 'play' && q && i >= 0 && i < q.ex.options.length) answer(q.ex.options[i].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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

      {phase === 'play' && q && (
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

// ---------------------------------------------------------------------------
// Fluency
// ---------------------------------------------------------------------------

interface FluencyQ {
  entry: VocabularyEntry
  options: string[]
  answer: string
}

/**
 * Fluency round (Nation's fourth strand): only well-known words, Turkish → target, timed per
 * answer. The score is the median time of correct answers, so one slow question doesn't spoil
 * a round, and the trend shows retrieval becoming automatic.
 */
function FluencyGame({
  language,
  vocabulary,
  states,
  best,
  last,
  recordKey,
  onExit,
  onChanged,
}: Props & { best?: number; last?: number; recordKey: string; onExit: () => void }) {
  const pool = useMemo(() => {
    const own = new Set(vocabulary.map((v) => v.id))
    return [...vocabulary, ...SAMPLE_WORDS[language].filter((w) => !own.has(w.id))]
  }, [vocabulary, language])
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const rng = useRef(createRng(Date.now()))
  const [round, setRound] = useState<FluencyQ[]>([])
  const [index, setIndex] = useState(0)
  const [times, setTimes] = useState<number[]>([])
  const [flash, setFlash] = useState<{ chosen: string; ok: boolean; ms: number } | null>(null)
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [result, setResult] = useState<{ median: number; accuracy: number; record: boolean; previous?: number } | null>(null)
  const shownAt = useRef(0)

  const begin = () => {
    const words = pickFluencyWords(vocabulary, states, rng.current)
    const qs = Array.from({ length: FLUENCY_ROUND }, (_, i) => {
      const entry = words[i % words.length]
      const answer = displayForm(entry)
      const options = shuffle([answer, ...pickDistractors(entry, pool, 3, rng.current).map(displayForm)], rng.current)
      return { entry, options, answer }
    })
    setRound(shuffle(qs, rng.current))
    setIndex(0)
    setTimes([])
    setFlash(null)
    setResult(null)
    setPhase('play')
    shownAt.current = performance.now()
  }

  const finish = async (allTimes: number[]) => {
    const med = median(allTimes)
    const accuracy = allTimes.length / FLUENCY_ROUND
    const record = allTimes.length > 0 && accuracy >= FLUENCY_MIN_ACCURACY && (!best || med < best)
    if (record) await db.saveRecord(recordKey, Math.round(med))
    if (allTimes.length) await db.saveRecord(`${recordKey}:last`, Math.round(med))
    setResult({ median: med, accuracy, record, previous: last })
    setPhase('over')
    sfx.levelUp()
    onChanged()
  }

  const answer = (label: string) => {
    if (phase !== 'play' || flash) return
    const q = round[index]
    const ms = performance.now() - shownAt.current
    const ok = label === q.answer
    void recordPractice(q.entry, stateById.get(q.entry.id), 'mc_meaning', ok, ms)
    const nextTimes = ok ? [...times, ms] : times
    if (ok) sfx.correct()
    else sfx.wrong()
    setTimes(nextTimes)
    setFlash({ chosen: label, ok, ms })
    setTimeout(
      () => {
        setFlash(null)
        if (index + 1 >= round.length) void finish(nextTimes)
        else {
          setIndex(index + 1)
          shownAt.current = performance.now()
        }
      },
      ok ? 220 : 900,
    )
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        begin()
      }
      const i = Number(e.key) - 1
      const q = round[index]
      if (phase === 'play' && q && i >= 0 && i < q.options.length) answer(q.options[i])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const q = round[index]
  const slowest = Math.max(1, ...times)

  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted">{best ? `Rekor: ${fmt(best)}` : ''}</span>
      </div>

      {phase === 'ready' && (
        <div className="celebrate stack">
          <h1>Akıcılık turu</h1>
          <p className="muted">
            Türkçesini gör, kelimeyi 1–4 tuşlarıyla seç. Hepsi bildiğin kelimeler; puan, doğru cevaplarındaki ortanca süre. Rekor için en az %
            {Math.round(FLUENCY_MIN_ACCURACY * 100)} doğru gerekir.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-lg" onClick={begin} autoFocus>
              Başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <>
          <div className="progress">
            <div style={{ width: `${(index / round.length) * 100}%` }} />
          </div>
          <h2 className="prompt-text">{q.entry.senses[0].gloss}</h2>
          <div className="options">
            {q.options.map((o, i) => (
              <button
                key={i}
                className={`option${flash && o === q.answer ? ' is-correct' : ''}${flash && !flash.ok && o === flash.chosen ? ' is-wrong' : ''}`}
                onClick={() => answer(o)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif" lang={language}>
                  {o}
                </span>
              </button>
            ))}
          </div>
          <p className="small muted fluency-live" aria-live="polite">
            {flash?.ok ? fmt(flash.ms) : times.length ? `Ortanca: ${fmt(median(times))}` : ' '}
          </p>
        </>
      )}

      {phase === 'over' && result && (
        <div className="celebrate stack">
          <h1>{result.record ? 'Yeni hız rekoru! 🏆' : 'Tur bitti'}</h1>
          <p className="xp-gain">{times.length ? `Soru başına ${fmt(result.median)}` : 'Doğru cevap yok'}</p>
          <p className="muted">
            {FLUENCY_ROUND} sorudan {times.length} doğru (%{Math.round(result.accuracy * 100)}).
            {result.previous && times.length
              ? result.median < result.previous
                ? ` Önceki turdan ${fmt(result.previous - result.median)} daha hızlı.`
                : ` Önceki tur: ${fmt(result.previous)}.`
              : ''}
            {result.accuracy < FLUENCY_MIN_ACCURACY && times.length ? ` Rekor için en az %${Math.round(FLUENCY_MIN_ACCURACY * 100)} doğru gerekiyor.` : ''}
          </p>
          {times.length > 1 && (
            <div className="fluency-bars" role="img" aria-label="Doğru cevapların süreleri, soru sırasıyla">
              {times.map((t, i) => (
                <span key={i} style={{ height: `${Math.max(8, (t / slowest) * 100)}%` }} title={fmt(t)} />
              ))}
            </div>
          )}
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

// ---------------------------------------------------------------------------
// Minimal pairs
// ---------------------------------------------------------------------------

const PAIR_ROUND = 12

/**
 * Hear one word of a minimal pair and pick it. Every answer gets immediate feedback and the
 * chance to hear both words back to back; voices vary between questions.
 */
function PairsGame({ language, best, recordKey, onExit }: Props & { best?: number; recordKey: string; onExit: () => void }) {
  const [round, setRound] = useState<PairQuestion[]>(() => pairRound(language, PAIR_ROUND, createRng(Date.now())))
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<{ q: PairQuestion; ok: boolean }[]>([])
  const [chosen, setChosen] = useState<'a' | 'b' | null>(null)
  const [record, setRecord] = useState(false)
  const q = round[index] as PairQuestion | undefined
  const done = index >= round.length

  useEffect(() => {
    if (q && chosen === null) speak(q.pair[q.answer].word, language, undefined, true)
  }, [q, chosen, language])

  const choose = (side: 'a' | 'b') => {
    if (!q || chosen) return
    const ok = side === q.answer
    if (ok) sfx.correct()
    else sfx.wrong()
    setChosen(side)
    setAnswers((a) => [...a, { q, ok }])
  }

  const next = async () => {
    setChosen(null)
    if (index + 1 >= round.length) {
      const pct = Math.round(((answers.filter((a) => a.ok).length) / round.length) * 100)
      if (pct > (best ?? 0)) {
        await db.saveRecord(recordKey, pct)
        setRecord(true)
      }
      sfx.levelUp()
    }
    setIndex((i) => i + 1)
  }

  const both = async () => {
    if (!q) return
    await speakAsync(q.pair.a.word, language)
    await new Promise((r) => setTimeout(r, 400))
    await speakAsync(q.pair.b.word, language)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !q) return
      if (e.code === 'Space') {
        e.preventDefault()
        speak(q.pair[q.answer].word, language, undefined, true)
      }
      if (!chosen && (e.key === '1' || e.key === '2')) choose(q.order[Number(e.key) - 1])
      if (chosen && e.key === 'Enter') void next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const right = answers.filter((a) => a.ok).length
  const missed = new Map<string, number>()
  for (const a of answers) if (!a.ok) missed.set(a.q.pair.contrast, (missed.get(a.q.pair.contrast) ?? 0) + 1)
  const worst = [...missed.entries()].sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {!done && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted">{best ? `Rekor: %${best}` : ''}</span>
      </div>

      {!done && q && (
        <div className="stack">
          <div className="row">
            <button className="speak speak-big" onClick={() => speak(q.pair[q.answer].word, language, undefined, true)} aria-label="Tekrar dinle">
              <SpeakerIcon size={36} />
            </button>
            <span className="small muted">Hangisini duydun? Boşluk: tekrar dinle · 1–2: seç · Fark: {q.pair.contrast}</span>
          </div>
          <div className="options">
            {q.order.map((side, i) => {
              const w = q.pair[side]
              const state = chosen ? (side === q.answer ? ' is-correct' : side === chosen ? ' is-wrong' : ' is-dim') : ''
              return (
                <button key={side} className={`option${state}`} disabled={!!chosen} onClick={() => choose(side)}>
                  <span className="key">{i + 1}</span>
                  <span>
                    <span className="option-serif" lang={language}>
                      {w.word}
                    </span>{' '}
                    <span className="small muted">{w.gloss}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {chosen && (
            <div className="row">
              <button className="btn btn-quiet" onClick={both}>
                İkisini art arda dinle
              </button>
              <button className="btn" onClick={next} autoFocus>
                Devam
              </button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="celebrate stack">
          <h1>{record ? 'Yeni rekor! 🏆' : 'Tur bitti'}</h1>
          <p className="xp-gain">
            {right} / {round.length} doğru
          </p>
          <p className="muted">{worst ? `En çok karıştırdığın ses farkı: ${worst[0]}. Bu çiftleri tekrar dinlemek kulağını alıştırır.` : 'Hiç karıştırmadın; kulağın bu farklara alışmış.'}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button
              className="btn btn-lg"
              autoFocus
              onClick={() => {
                setRound(pairRound(language, PAIR_ROUND, createRng(Date.now())))
                setIndex(0)
                setAnswers([])
                setRecord(false)
              }}
            >
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

// ---------------------------------------------------------------------------
// Gender rules
// ---------------------------------------------------------------------------

const GENDER_ROUND = 15

/**
 * Gender rules drill: each noun is answered by its ending, then the rule (or the exception) is
 * shown. Rules behind the learner's own gender mistakes come up more often.
 */
function GenderGame({
  language,
  vocabulary,
  mistakes = [],
  best,
  recordKey,
  onExit,
}: Props & { language: 'fr' | 'es'; best?: number; recordKey: string; onExit: () => void }) {
  const trouble = useMemo(() => troubleRules(mistakes, vocabulary).filter((t) => t.rule.language === language), [mistakes, vocabulary, language])
  const newRound = useCallback(
    () => ruleQuiz(language, GENDER_ROUND, createRng(Date.now()), trouble.map((t) => t.rule.id), vocabulary),
    [language, trouble, vocabulary],
  )
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<RuleQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<'m' | 'f' | null>(null)
  const [results, setResults] = useState<{ q: RuleQuestion; ok: boolean }[]>([])
  const [record, setRecord] = useState(false)
  const art = { m: language === 'fr' ? 'le' : 'el', f: 'la' }
  const q = round[index]

  const start = () => {
    setRound(newRound())
    setIndex(0)
    setResults([])
    setChosen(null)
    setRecord(false)
    setPhase('play')
  }

  const choose = (g: 'm' | 'f') => {
    if (!q || chosen) return
    const ok = g === q.answer
    if (ok) sfx.correct()
    else sfx.wrong()
    setChosen(g)
    setResults((r) => [...r, { q, ok }])
  }

  const next = async () => {
    setChosen(null)
    if (index + 1 < round.length) return setIndex(index + 1)
    const pct = Math.round((results.filter((r) => r.ok).length / round.length) * 100)
    if (pct > (best ?? 0)) {
      await db.saveRecord(recordKey, pct)
      setRecord(true)
    }
    sfx.levelUp()
    setPhase('over')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play') return
      if (!chosen && (e.key === '1' || e.key === '2')) choose(e.key === '1' ? 'm' : 'f')
      else if (chosen && e.key === 'Enter') void next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const rules = GENDER_RULES.filter((g) => g.language === language)
  const missed = results.filter((r) => !r.ok)

  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted">{best ? `Rekor: %${best}` : ''}</span>
      </div>

      {phase === 'intro' && (
        <div className="stack">
          <h1 className="greeting">Cinsiyet kuralları</h1>
          {trouble.length > 0 && (
            <p className="notice">
              En çok takıldığın: {trouble.slice(0, 3).map((t) => `-${t.rule.suffix} (${t.mistakes} hata)`).join(', ')}. Bu turda daha sık gelecekler.
            </p>
          )}
          <ul className="rule-list">
            {rules.map((g) => (
              <li key={g.id}>
                <span className={`rule-suffix ${g.gender}`}>-{g.suffix}</span>
                <span>
                  <strong>{g.gender === 'f' ? 'dişil' : 'eril'}</strong> <span className="small muted">{g.examples.slice(0, 3).join(', ')}</span>
                  {g.exceptions.length > 0 && <span className="small rule-exc"> · istisna: {g.exceptions.join(', ')}</span>}
                </span>
              </li>
            ))}
          </ul>
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus>
              {GENDER_ROUND} soruluk tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack">
          <p className="prompt-label">Artikeli hangisi? Kelimenin sonuna bak.</p>
          <h1 className="word" lang={language}>
            <span className="blank">____</span> {q.noun}
          </h1>
          <div className="options">
            {(['m', 'f'] as const).map((g, i) => (
              <button
                key={g}
                className={`option${chosen ? (g === q.answer ? ' is-correct' : g === chosen ? ' is-wrong' : ' is-dim') : ''}`}
                disabled={!!chosen}
                onClick={() => choose(g)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif">{art[g]}</span>
              </button>
            ))}
          </div>
          {chosen && (
            <div className="stack">
              <p className={q.exception ? 'cross-warn' : 'small'}>
                {q.exception
                  ? `İstisna! -${q.rule.suffix} ile bitenler genelde ${q.rule.gender === 'f' ? 'dişil' : 'eril'}, ama ${art[q.answer]} ${q.noun}.`
                  : `-${q.rule.suffix} → ${q.rule.gender === 'f' ? 'dişil' : 'eril'}: ${art[q.answer]} ${q.noun}.`}
              </p>
              <div className="row">
                <button className="btn" onClick={next} autoFocus>
                  Devam
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'over' && (
        <div className="celebrate stack">
          <h1>{record ? 'Yeni rekor! 🏆' : 'Tur bitti'}</h1>
          <p className="xp-gain">
            {round.length - missed.length} / {round.length} doğru
          </p>
          {missed.length > 0 && (
            <p className="muted">Kaçırdıkların: {missed.map((m) => `${art[m.q.answer]} ${m.q.noun}${m.q.exception ? ' (istisna)' : ''}`).join(', ')}</p>
          )}
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-lg" onClick={start} autoFocus>
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
