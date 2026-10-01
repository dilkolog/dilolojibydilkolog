import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { PlanItem } from '../engine/dailyPlan'
import {
  BLANK,
  buildExercise,
  displayForm,
  evaluateChoice,
  evaluateTyped,
  HINT_DELAYS_MS,
  type ChoiceExercise,
  type Evaluation,
  type Exercise,
  type TypedExercise,
} from '../engine/exercises'
import { masteryStage } from '../engine/mastery'
import { newWordState, processAttempt } from '../engine/review'
import { createRng, type Rng } from '../engine/rng'
import type { Scheduler } from '../engine/scheduler'
import {
  completeItem,
  currentItem,
  isFinished,
  retryItem,
  startSession,
  summarize,
  type SessionLogEntry,
  type SessionSummary,
} from '../engine/session'
import type { Mistake, ReviewMode, UserWordState, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { ERROR_HINT, LANGUAGE_NAME, POS_NAME, PROMPT_TEXT } from './labels'
import { canSpeak, speak } from './speech'

interface Props {
  items: PlanItem[]
  /** 'practice' = free practice: answers don't touch the schedule or the Mistake Bank. */
  mode: ReviewMode
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
  db: KelimeDB
  scheduler: Scheduler
  seed: number
  onFinish: (summary: SessionSummary) => void
  onQuit: () => void
}

export function SessionScreen(p: Props) {
  const byId = useMemo(() => new Map(p.vocabulary.map((e) => [e.id, e])), [p.vocabulary])
  const states = useRef(new Map(p.states.map((s) => [s.entryId, s])))
  const mistakes = useRef(p.mistakes)
  const rng = useMemo(() => createRng(p.seed ^ 0x5bd1e995), [p.seed])
  const [session, setSession] = useState(() => startSession(p.items))
  const item = currentItem(session)
  const { onFinish } = p

  useEffect(() => {
    if (isFinished(session)) onFinish(summarize(session))
  }, [session, onFinish])

  if (!item) return null
  const entry = byId.get(item.entryId)
  const progress = (session.index / session.items.length) * 100

  const next = (log: Omit<SessionLogEntry, 'item'>, retry?: PlanItem) =>
    setSession((s) => completeItem(s, log, retry))

  if (!entry) {
    // The word was deleted after the plan was built.
    queueMicrotask(() => next({ entryId: item.entryId }))
    return null
  }

  const introduce = async () => {
    if (!states.current.has(entry.id)) {
      const state = newWordState(entry, new Date())
      states.current.set(entry.id, state)
      await p.db.wordStates.put(state)
    }
    next({ entryId: entry.id })
  }

  const answer = async (ev: Evaluation, responseMs: number, hintsUsed: number, maxHints: number) => {
    const before = states.current.get(entry.id) ?? newWordState(entry, new Date())
    const result = processAttempt(
      before,
      {
        exerciseType: item.exerciseType!,
        verdict: ev.verdict,
        errorType: ev.errorType,
        given: ev.given,
        expected: ev.expected,
        responseMs,
        hintsUsed,
        maxHints,
        at: new Date(),
        mode: p.mode,
      },
      mistakes.current,
      p.scheduler,
    )
    states.current.set(entry.id, result.state)
    mistakes.current = result.mistakes
    await p.db.saveReview(result)
    return {
      entryId: entry.id,
      verdict: ev.verdict,
      errorType: ev.errorType,
      stageBefore: masteryStage(before),
      stageAfter: masteryStage(result.state),
    }
  }

  const proceed = (log: Omit<SessionLogEntry, 'item'>) => {
    const state = states.current.get(entry.id)
    const retry = log.verdict === 'wrong' && state ? retryItem(item, entry, state, rng) : undefined
    next(log, retry)
  }

  return (
    <div>
      <div className="session-top">
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${progress}%` }} />
        </div>
        {p.mode === 'practice' && <span className="small muted">Serbest pratik</span>}
        <button className="link" onClick={p.onQuit}>
          Bitir
        </button>
      </div>
      {item.kind === 'introduce' ? (
        <Intro key={session.index} entry={entry} onContinue={introduce} />
      ) : (
        <ExerciseRunner
          key={session.index}
          entry={entry}
          item={item}
          catalog={p.vocabulary}
          rng={rng}
          onAnswer={answer}
          onContinue={proceed}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function SpeakButton({ text, entry, big, auto }: { text: string; entry: VocabularyEntry; big?: boolean; auto?: boolean }) {
  useEffect(() => {
    if (auto) speak(text, entry.language)
  }, [auto, text, entry.language])
  if (!canSpeak()) return null
  return (
    <button
      type="button"
      className={big ? 'speak speak-big' : 'speak'}
      onClick={() => speak(text, entry.language)}
      aria-label="Sesli dinle"
    >
      <svg width={big ? 28 : 18} height={big ? 28 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
      </svg>
    </button>
  )
}

function Word({ entry }: { entry: VocabularyEntry }) {
  if (!entry.article) return <h1 className="word">{entry.lemma}</h1>
  const sep = entry.article.endsWith("'") ? '' : ' '
  return (
    <h1 className="word">
      <span className="article">{entry.article}</span>
      {sep}
      {entry.lemma}
    </h1>
  )
}

function Sentence({ text, translation }: { text: string; translation?: string }) {
  const parts = text.split(BLANK)
  return (
    <div>
      <p className="sentence">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="blank" aria-label="boşluk">
                ____
              </span>
            )}
          </span>
        ))}
      </p>
      {translation && <p className="sentence-tr">{translation}</p>}
    </div>
  )
}

/**
 * First encounter: only the word, its sound, the core meaning and one strong example.
 * Collocations and word family are revealed in later encounters, not all at once.
 */
function Intro({ entry, onContinue }: { entry: VocabularyEntry; onContinue: () => void }) {
  const sense = entry.senses[0]
  const example = sense.examples[0]
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => btn.current?.focus(), [])
  return (
    <div className="stack">
      <p className="prompt-label">Yeni kelime{entry.partOfSpeech !== 'other' && ` (${POS_NAME[entry.partOfSpeech]})`}</p>
      <div className="row">
        <Word entry={entry} />
        <SpeakButton text={displayForm(entry)} entry={entry} auto />
      </div>
      <p className="gloss">{[sense.gloss, ...(sense.altGlosses ?? [])].join(', ')}</p>
      {example && <Sentence text={example.text} translation={example.translation} />}
      <div className="session-actions">
        <button ref={btn} className="btn" onClick={onContinue}>
          Devam
        </button>
        <span className="kbd">Enter</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

interface RunnerProps {
  entry: VocabularyEntry
  item: PlanItem
  catalog: VocabularyEntry[]
  rng: Rng
  onAnswer: (ev: Evaluation, responseMs: number, hintsUsed: number, maxHints: number) => Promise<Omit<SessionLogEntry, 'item'>>
  onContinue: (log: Omit<SessionLogEntry, 'item'>) => void
}

function ExerciseRunner({ entry, item, catalog, rng, onAnswer, onContinue }: RunnerProps) {
  const [exercise] = useState<Exercise>(() => buildExercise(item.exerciseType!, entry, catalog, rng))
  const startedAt = useRef(performance.now())
  const [result, setResult] = useState<{ ev: Evaluation; log: Omit<SessionLogEntry, 'item'>; chosen?: string } | null>(null)
  const continueBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (result) continueBtn.current?.focus()
  }, [result])

  const busy = useRef(false)

  const submit = async (ev: Evaluation, hintsUsed: number, maxHints: number, chosen?: string) => {
    // Guards against a double click/keypress recording the same answer twice.
    if (busy.current) return
    busy.current = true
    const ms = Math.round(performance.now() - startedAt.current)
    const log = await onAnswer(ev, ms, hintsUsed, maxHints)
    setResult({ ev, log, chosen })
    if (exercise.type !== 'listen_type' && exercise.type !== 'listen_choose') return
    speak(displayForm(entry), entry.language)
  }

  return (
    <div>
      <p className="prompt-label">
        {exercise.type === 'typed_translation' ? `${LANGUAGE_NAME[entry.language]} karşılığını yaz` : PROMPT_TEXT[exercise.type]}
      </p>
      <Prompt exercise={exercise} entry={entry} />
      {exercise.kind === 'choice' ? (
        <Choices exercise={exercise} chosen={result?.chosen} answered={!!result} onChoose={(id) => submit(evaluateChoice(exercise, id), 0, 0, id)} />
      ) : (
        <TypedAnswer
          exercise={exercise}
          answered={!!result}
          onSubmit={(text, hints) => submit(evaluateTyped(exercise, text, entry, catalog), hints, exercise.hints.length)}
        />
      )}
      {result && <Feedback ev={result.ev} entry={entry} />}
      {result && (
        <div className="session-actions">
          <button ref={continueBtn} className="btn" onClick={() => onContinue(result.log)}>
            Devam
          </button>
          <span className="kbd">Enter</span>
        </div>
      )}
    </div>
  )
}

function Prompt({ exercise, entry }: { exercise: Exercise; entry: VocabularyEntry }) {
  switch (exercise.type) {
    case 'mc_meaning':
      return (
        <div className="row">
          <Word entry={entry} />
          <SpeakButton text={displayForm(entry)} entry={entry} />
        </div>
      )
    case 'listen_choose':
    case 'listen_type':
      return canSpeak() ? (
        <SpeakButton text={exercise.audioText!} entry={entry} big auto />
      ) : (
        <p className="muted">Bu tarayıcıda sesli okuma yok. Kelime: {exercise.audioText}</p>
      )
    case 'mc_context':
    case 'discriminate':
    case 'cloze_typed':
      return <Sentence text={exercise.context!} translation={exercise.contextTranslation} />
    default:
      return <p className="word" style={{ color: 'var(--ink)' }}>{exercise.prompt}</p>
  }
}

function Choices({
  exercise,
  chosen,
  answered,
  onChoose,
}: {
  exercise: ChoiceExercise
  chosen?: string
  answered: boolean
  onChoose: (id: string) => void
}) {
  // Number keys pick an option, so a whole session can run from the keyboard.
  useEffect(() => {
    if (answered) return
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1
      if (i >= 0 && i < exercise.options.length) onChoose(exercise.options[i].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answered, exercise, onChoose])

  const targetText = exercise.type !== 'mc_meaning' && exercise.type !== 'listen_choose'
  return (
    <div className="options">
      {exercise.options.map((o, i) => {
        const state = answered
          ? o.id === exercise.correctOptionId
            ? 'is-correct'
            : o.id === chosen
              ? 'is-wrong'
              : ''
          : ''
        return (
          <button key={o.id} className={`option ${state}`} disabled={answered} onClick={() => onChoose(o.id)}>
            <span className="key">{i + 1}</span>
            <span className={targetText ? 'option-serif' : ''}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Hints are released on a delay (desirable difficulty): the learner first has to try
 * retrieving the word unaided, and each hint costs grade.
 */
function TypedAnswer({
  exercise,
  answered,
  onSubmit,
}: {
  exercise: TypedExercise
  answered: boolean
  onSubmit: (text: string, hintsUsed: number) => void
}) {
  const [text, setText] = useState('')
  const [shown, setShown] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const start = useRef(performance.now())

  useEffect(() => {
    if (answered) return
    const t = setInterval(() => setElapsed(performance.now() - start.current), 500)
    return () => clearInterval(t)
  }, [answered])

  const nextDelay = HINT_DELAYS_MS[shown] ?? Infinity
  const waitSec = Math.max(0, Math.ceil((nextDelay - elapsed) / 1000))
  const canHint = shown < exercise.hints.length && waitSec === 0 && !answered

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!answered && text.trim()) onSubmit(text, shown)
  }

  return (
    <form onSubmit={submit}>
      <label className="sr-only" htmlFor="answer">
        Cevabın
      </label>
      <input
        id="answer"
        className="answer-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={answered}
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        lang={exercise.entryId.slice(0, 2)}
      />
      {shown > 0 && (
        <div className="hints">
          {exercise.hints.slice(0, shown).map((h, i) => (
            <p key={i} className="hint">
              {h}
            </p>
          ))}
        </div>
      )}
      {!answered && (
        <div className="session-actions">
          <button className="btn" type="submit" disabled={!text.trim()}>
            Kontrol et
          </button>
          {shown < exercise.hints.length && (
            <button type="button" className="btn btn-quiet" disabled={!canHint} onClick={() => setShown((n) => n + 1)}>
              {waitSec > 0 ? `İpucu (${waitSec})` : 'İpucu'}
            </button>
          )}
        </div>
      )}
    </form>
  )
}

function Feedback({ ev, entry }: { ev: Evaluation; entry: VocabularyEntry }) {
  const cls = ev.verdict === 'correct' ? 'ok' : ev.verdict
  const title = ev.verdict === 'correct' ? 'Doğru' : ev.verdict === 'near' ? 'Neredeyse' : 'Doğrusu'
  const hint = ev.errorType && ev.verdict !== 'correct' ? ERROR_HINT[ev.errorType] : ''
  const example = entry.senses[0].examples[0]
  return (
    <div className={`feedback ${cls}`} role="status">
      <p className="feedback-title">{title}</p>
      {ev.verdict !== 'correct' && <p className="expected">{ev.expected}</p>}
      {hint && <p className="small">{hint}</p>}
      <p className="small muted" style={{ marginTop: '0.5rem' }}>
        {displayForm(entry)}: {entry.senses[0].gloss}
        {example && ev.verdict !== 'correct' ? `. ${example.text}` : ''}
      </p>
    </div>
  )
}
