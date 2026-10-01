import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { PlanItem } from '../engine/dailyPlan'
import {
  BLANK,
  buildExercise,
  displayForm,
  evaluateChoice,
  evaluateTyped,
  type ChoiceExercise,
  type Evaluation,
  type Exercise,
  type TypedExercise,
} from '../engine/exercises'
import { xpForAnswer } from '../engine/gamification'
import { masteryStage } from '../engine/mastery'
import { markKnown, needsIntervention, newWordState, processAttempt, type AttemptInput } from '../engine/review'
import { createRng, type Rng } from '../engine/rng'
import type { Scheduler } from '../engine/scheduler'
import {
  completeItem,
  currentItem,
  isFinished,
  retryItem,
  skipRemaining,
  startSession,
  summarize,
  type SessionLogEntry,
  type SessionSummary,
} from '../engine/session'
import type { EngineOptions, Mistake, ReviewMode, UserWordState, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { SAMPLE_WORDS } from '../data/seed'
import { ERROR_HINT, LANGUAGE_NAME, POS_NAME, PROMPT_TEXT } from './labels'
import { AiError, evaluateSentence } from '../ai'
import { useAi } from './aiContext'
import { ConfirmDialog } from './Dialog'
import { MnemonicDialog } from './Mnemonic'
import { AlertIcon, CheckIcon, CloseIcon, FlameIcon, SpeakerIcon, StarIcon } from './icons'
import { prefs } from './prefs'
import { sfx } from './sounds'
import { canSpeak, playWord, speak, speechPrefs } from './speech'
import { useMediaUrl } from './useMedia'
import { canListen, listen } from './speechInput'

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
  options: EngineOptions
  onFinish: (summary: SessionSummary) => void
  onQuit: () => void
}

export function SessionScreen(p: Props) {
  // State, not memo: an override can add an accepted spelling to a word mid-session.
  const [byId, setById] = useState(() => new Map(p.vocabulary.map((e) => [e.id, e])))
  /** The last answer, kept so "my answer was right too" can recompute it from the prior state. */
  const lastAnswer = useRef<{ before: UserWordState; bank: Mistake[]; input: AttemptInput; eventId: string } | null>(null)
  const states = useRef(new Map(p.states.map((s) => [s.entryId, s])))
  const mistakes = useRef(p.mistakes)
  // Distractors may come from the sample set too, so options are full even with few own words.
  const distractorPool = useMemo(() => {
    const own = new Set(p.vocabulary.map((v) => v.id))
    const lang = p.vocabulary[0]?.language
    return [...p.vocabulary, ...(lang ? SAMPLE_WORDS[lang].filter((w) => !own.has(w.id)) : [])]
  }, [p.vocabulary])
  const rng = useMemo(() => createRng(p.seed ^ 0x5bd1e995), [p.seed])
  const [session, setSession] = useState(() => startSession(p.items))
  const item = currentItem(session)
  const { onFinish } = p

  useEffect(() => {
    if (isFinished(session)) onFinish(summarize(session))
  }, [session, onFinish])

  const { onQuit } = p
  const [confirmQuit, setConfirmQuit] = useState(false)
  const answered = session.log.filter((l) => l.verdict).length
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A dialog that is open (or closing on this same keypress) owns Esc.
      if (e.key === 'Escape' && !modalOpen()) setConfirmQuit(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  const introduce = async (known = false) => {
    const now = new Date()
    let state = states.current.get(entry.id) ?? newWordState(entry, now)
    if (known) state = markKnown(state, p.scheduler, now)
    states.current.set(entry.id, state)
    await p.db.wordStates.put(state)
    if (known) setSession((s) => skipRemaining(completeItem(s, { entryId: entry.id }), entry.id))
    else next({ entryId: entry.id })
  }

  const answer = async (ev: Evaluation, responseMs: number, hintsUsed: number, maxHints: number) => {
    const before = states.current.get(entry.id) ?? newWordState(entry, new Date())
    const input: AttemptInput = {
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
    }
    const bank = mistakes.current
    const result = processAttempt(before, input, bank, p.scheduler)
    states.current.set(entry.id, result.state)
    mistakes.current = result.mistakes
    await p.db.saveReview(result)
    lastAnswer.current = { before, bank, input, eventId: result.event.id }
    const runBefore = comboOf(session.log)
    const xp = xpForAnswer({ exerciseType: input.exerciseType, verdict: ev.verdict, hintsUsed, responseMs, mode: p.mode, combo: runBefore })
    const run = ev.verdict === 'wrong' ? 0 : runBefore + 1
    if (ev.verdict === 'wrong') sfx.wrong()
    else if (run === 5 || run === 10 || run === 20) sfx.combo()
    else if (ev.verdict === 'near') sfx.near()
    else sfx.correct()
    return {
      entryId: entry.id,
      verdict: ev.verdict,
      errorType: ev.errorType,
      stageBefore: masteryStage(before),
      stageAfter: masteryStage(result.state),
      xp,
    }
  }

  /**
   * The learner says the answer was actually right (e.g. a valid synonym). Recompute the review
   * from the state before it, and remember the spelling so it is accepted next time.
   */
  const override = async (): Promise<Omit<SessionLogEntry, 'item'> | null> => {
    const last = lastAnswer.current
    if (!last) return null
    const input: AttemptInput = { ...last.input, verdict: 'correct', errorType: undefined }
    const result = processAttempt(last.before, input, last.bank, p.scheduler)
    const keep = new Set(result.mistakes.map((m) => m.id))
    const stale = mistakes.current.filter((m) => m.entryId === entry.id && !keep.has(m.id)).map((m) => m.id)
    await p.db.replaceReview(last.eventId, result, stale)
    states.current.set(entry.id, result.state)
    mistakes.current = result.mistakes
    lastAnswer.current = { ...last, input, eventId: result.event.id }
    const given = last.input.given?.trim()
    if (given && (input.exerciseType === 'typed_translation' || input.exerciseType === 'listen_type')) {
      const updated = { ...entry, alternativeForms: [...new Set([...(entry.alternativeForms ?? []), given])] }
      setById((m) => new Map(m).set(entry.id, updated))
      await p.db.vocabulary.put(updated)
    }
    const xp = xpForAnswer({ exerciseType: input.exerciseType, verdict: 'correct', hintsUsed: input.hintsUsed, responseMs: input.responseMs, mode: p.mode, combo: 0 })
    return { entryId: entry.id, verdict: 'correct', stageBefore: masteryStage(last.before), stageAfter: masteryStage(result.state), xp }
  }

  const proceed = (log: Omit<SessionLogEntry, 'item'>) => {
    const state = states.current.get(entry.id)
    const retry = log.verdict === 'wrong' && state ? retryItem(item, entry, state, rng, p.options) : undefined
    next(log, retry)
  }

  const combo = comboOf(session.log)
  const sessionXp = session.log.reduce((sum, l) => sum + (l.xp ?? 0), 0)

  return (
    <div>
      <div className="session-top">
        <button className="icon-btn" onClick={() => setConfirmQuit(true)} aria-label="Oturumu bitir">
          <CloseIcon size={22} />
        </button>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${Math.max(progress, 3)}%` }} />
        </div>
        {combo >= 3 ? (
          <span className="combo" key={combo}>
            <FlameIcon size={18} /> {combo}
          </span>
        ) : (
          <span className="progress-count">
            {session.index}/{session.items.length}
          </span>
        )}
        <span className="session-xp" key={sessionXp}>
          <StarIcon size={16} className="icon-star" /> {sessionXp}
        </span>
      </div>
      {p.mode === 'practice' && (
        <p style={{ marginTop: '-1.5rem', marginBottom: '1.5rem' }}>
          <span className="badge">Serbest pratik</span>
        </p>
      )}
      {prefs.showKeyLegend && <KeyLegend />}
      {confirmQuit && (
        <ConfirmDialog
          title="Oturumdan çıkılsın mı?"
          confirmLabel="Çık"
          cancelLabel="Devam et"
          danger
          onConfirm={onQuit}
          onCancel={() => setConfirmQuit(false)}
        >
          {answered > 0
            ? `Verdiğin ${answered} cevap kaydedildi. Kalan ${session.items.length - session.index} soru bugünkü görevinde bekleyecek.`
            : 'Henüz cevap vermedin; görev olduğu gibi bekleyecek.'}
        </ConfirmDialog>
      )}
      {item.kind === 'introduce' ? (
        <Intro key={session.index} entry={entry} onContinue={() => introduce(false)} onKnown={() => introduce(true)} />
      ) : (
        <ExerciseRunner
          key={session.index}
          entry={entry}
          item={item}
          catalog={distractorPool}
          rng={rng}
          onAnswer={answer}
          onOverride={override}
          onContinue={proceed}
          struggling={() => needsIntervention(states.current.get(entry.id) ?? newWordState(entry, new Date()))}
          onEntryUpdated={(updated) => setById((m) => new Map(m).set(updated.id, updated))}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function SpeakButton({ text, entry, big, auto }: { text: string; entry: VocabularyEntry; big?: boolean; auto?: boolean }) {
  useEffect(() => {
    if (auto && prefs.autoPlay) playWord(entry, text)
  }, [auto, text, entry.language])

  // Alt+S anywhere, or Space when not typing, replays the audio.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen()) return
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if ((e.altKey && e.code === 'KeyS') || (e.code === 'Space' && !typing && !(e.target instanceof HTMLButtonElement))) {
        e.preventDefault()
        playWord(entry, text)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [text, entry.language])
  if (!canSpeak()) return null
  return (
    <button
      type="button"
      className={big ? 'speak speak-big' : 'speak'}
      onClick={() => playWord(entry, text)}
      aria-label="Sesli dinle"
    >
      <SpeakerIcon size={big ? 36 : 22} />
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
function Intro({ entry, onContinue, onKnown }: { entry: VocabularyEntry; onContinue: () => void; onKnown: () => void }) {
  const sense = entry.senses[0]
  const example = sense.examples[0]
  const btn = useRef<HTMLButtonElement>(null)
  const imageUrl = useMediaUrl(entry.imageId)
  useEffect(() => btn.current?.focus(), [])
  return (
    <div>
      <p className="prompt-label">
        <span className="badge">Yeni kelime</span>
        {entry.partOfSpeech !== 'other' && <span className="small muted"> {POS_NAME[entry.partOfSpeech]}</span>}
      </p>
      <div className="intro-card stack">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <Word entry={entry} />
          <SpeakButton text={displayForm(entry)} entry={entry} auto />
        </div>
        {imageUrl && <img className="word-image" src={imageUrl} alt="" />}
        <p className="gloss">{[sense.gloss, ...(sense.altGlosses ?? [])].join(', ')}</p>
        {entry.notes && <p className="note">💡 {entry.notes}</p>}
        {example && (
          <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <Sentence text={example.text} translation={example.translation} />
            {canSpeak() && (
              <button className="icon-btn" onClick={() => speak(example.text, entry.language, speechPrefs.rate * 0.95)} aria-label="Cümleyi dinle">
                <SpeakerIcon size={20} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="session-actions">
        <button ref={btn} className="btn btn-lg" style={{ flex: 1 }} onClick={onContinue}>
          Öğrendim, devam
        </button>
        <button className="btn btn-lg btn-quiet" onClick={onKnown}>
          Zaten biliyorum
        </button>
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
  onOverride: () => Promise<Omit<SessionLogEntry, 'item'> | null>
  onContinue: (log: Omit<SessionLogEntry, 'item'>) => void
  /** The word has been missed several times in a row: offer a memory hook. */
  struggling: () => boolean
  onEntryUpdated: (entry: VocabularyEntry) => void
}

/** With "strict accents" on, a missing accent is an error rather than a near miss. */
const strictAccents = (ev: Evaluation): Evaluation => (prefs.accentStrict && ev.errorType === 'accent' ? { ...ev, verdict: 'wrong' } : ev)

/** An evaluation plus optional AI feedback text (free sentences). */
type Graded = Evaluation & { feedback?: string }

function ExerciseRunner({ entry, item, catalog, rng, onAnswer, onOverride, onContinue, struggling, onEntryUpdated }: RunnerProps) {
  const [mnemonic, setMnemonic] = useState<'offer' | 'open' | 'saved' | null>(null)
  const [typeInstead, setTypeInstead] = useState(false)
  const [exercise] = useState<Exercise>(() => buildExercise(item.exerciseType!, entry, catalog, rng))
  const startedAt = useRef(performance.now())
  const [result, setResult] = useState<{ ev: Graded; log: Omit<SessionLogEntry, 'item'>; chosen?: string } | null>(null)
  const [pending, setPending] = useState(false)
  const [aiError, setAiError] = useState('')
  const { apiKey } = useAi()
  const continueBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (result) continueBtn.current?.focus()
  }, [result])

  const busy = useRef(false)

  const submit = async (ev: Graded, hintsUsed: number, maxHints: number, chosen?: string, ms = Math.round(performance.now() - startedAt.current)) => {
    // Guards against a double click/keypress recording the same answer twice.
    if (busy.current) return
    busy.current = true
    const log = await onAnswer(ev, ms, hintsUsed, maxHints)
    setResult({ ev, log, chosen })
    if (ev.verdict === 'wrong' && struggling()) setMnemonic('offer')
    if (exercise.type !== 'listen_type' && exercise.type !== 'listen_choose') return
    playWord(entry)
  }

  /** Free sentences are graded by the AI; time is measured up to submission, not the network wait. */
  const submitSentence = async (text: string, hints: number) => {
    if (!apiKey || pending) return
    const ms = Math.round(performance.now() - startedAt.current)
    setPending(true)
    setAiError('')
    try {
      const g = await evaluateSentence(apiKey, entry, text.trim())
      await submit(
        { verdict: g.verdict, errorType: g.errorType, given: text.trim(), expected: g.corrected, feedback: g.feedback },
        hints,
        exercise.kind === 'typed' ? exercise.hints.length : 0,
        undefined,
        ms,
      )
    } catch (e) {
      setAiError(e instanceof AiError ? e.message : 'Değerlendirme yapılamadı.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <p className="prompt-label">
        {exercise.type === 'typed_translation'
          ? `${LANGUAGE_NAME[entry.language]} karşılığını yaz`
          : exercise.type === 'speak_word'
            ? `${LANGUAGE_NAME[entry.language]} karşılığını söyle`
            : PROMPT_TEXT[exercise.type]}
      </p>
      <Prompt exercise={exercise} entry={entry} />
      {exercise.kind === 'choice' ? (
        <Choices exercise={exercise} chosen={result?.chosen} answered={!!result} onChoose={(id) => submit(evaluateChoice(exercise, id), 0, 0, id)} />
      ) : (
        exercise.type === 'speak_word' && !typeInstead ? (
          <SpeakAnswer
            language={entry.language}
            answered={!!result}
            onTypeInstead={() => setTypeInstead(true)}
            onHeard={(alternatives) => {
              // Any recognised alternative that is right counts: recognition errors shouldn't cost the learner.
              const rank = { correct: 2, near: 1, wrong: 0 }
              const best = alternatives
                .map((a) => evaluateTyped(exercise, a, entry, catalog))
                .sort((a, b) => rank[b.verdict] - rank[a.verdict])[0]
              if (best) void submit(best, 0, exercise.hints.length)
            }}
          />
        ) : (
        <TypedAnswer
          exercise={exercise}
          language={entry.language}
          answered={!!result || pending}
          pending={pending}
          verdict={result?.ev.verdict}
          onSubmit={(text, hints) =>
            exercise.type === 'free_sentence'
              ? submitSentence(text, hints)
              : submit(strictAccents(evaluateTyped(exercise, text, entry, catalog)), hints, exercise.hints.length)
          }
        />
        )
      )}
      {mnemonic === 'open' && (
        <MnemonicDialog
          entry={entry}
          reason="Bu kelimeye birkaç kez takıldın; bir hafıza ipucu deneyelim."
          onClose={() => setMnemonic('offer')}
          onSaved={(updated) => {
            onEntryUpdated(updated)
            setMnemonic('saved')
          }}
        />
      )}
      {aiError && !result && (
        <div className="session-actions">
          <p className="error" role="alert">
            {aiError}
          </p>
          <button className="btn btn-quiet" onClick={() => onContinue({ entryId: entry.id })}>
            Bu soruyu atla
          </button>
        </div>
      )}
      {result && (
        <>
          <div className="sheet-spacer" />
          <Feedback
            ev={result.ev}
            xp={result.log.xp}
            entry={entry}
            mnemonic={mnemonic}
            onMnemonic={() => setMnemonic('open')}
            continueRef={continueBtn}
            onContinue={() => onContinue(result.log)}
            onOverride={
              exercise.kind === 'typed' && exercise.type !== 'free_sentence' && result.ev.verdict !== 'correct'
                ? async () => {
                    const log = await onOverride()
                    if (log) setResult({ ...result, log, ev: { ...result.ev, verdict: 'correct', errorType: undefined, feedback: 'Doğru sayıldı. Bu yazımı bundan sonra kabul edeceğim.' } })
                  }
                : undefined
            }
          />
        </>
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
    case 'picture_choice':
      return <PictureFrame id={exercise.imageId} />
    case 'dictation':
      return (
        <div className="row">
          <SpeakButton text={exercise.audioText!} entry={entry} big auto />
          <button className="btn btn-quiet" onClick={() => speak(exercise.audioText!, entry.language, 0.7)}>
            🐢 Yavaş dinle
          </button>
        </div>
      )
    case 'speak_word':
      return <p className="prompt-text">{exercise.prompt}</p>
    case 'free_sentence':
      return (
        <div className="stack">
          <div className="row">
            <Word entry={entry} />
            <SpeakButton text={displayForm(entry)} entry={entry} />
          </div>
          <p className="muted">
            {entry.senses[0].gloss}. {exercise.context}
          </p>
        </div>
      )
    default:
      return <p className="prompt-text">{exercise.prompt}</p>
  }
}

function PictureFrame({ id }: { id?: string }) {
  const url = useMediaUrl(id)
  return url ? <img className="word-image" src={url} alt="Kelimenin görseli" /> : <div className="word-image" style={{ height: '12rem', background: 'var(--surface-2)' }} />
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
      if (modalOpen()) return
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
              : 'is-dim'
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
  language,
  answered,
  pending,
  verdict,
  onSubmit,
}: {
  exercise: TypedExercise
  language: VocabularyEntry['language']
  answered: boolean
  pending?: boolean
  verdict?: Evaluation['verdict']
  onSubmit: (text: string, hintsUsed: number) => void
}) {
  const [text, setText] = useState('')
  const [hearing, setHearing] = useState(false)
  const stopListening = useRef<() => void>(() => {})
  useEffect(() => () => stopListening.current(), [])
  const dictate = () => {
    if (hearing) return stopListening.current()
    setHearing(true)
    stopListening.current = listen(language, {
      onInterim: (t) => setText(t),
      onFinal: (alts) => setText(alts[0] ?? ''),
      onError: () => setHearing(false),
      onEnd: () => setHearing(false),
    })
  }
  const [shown, setShown] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const start = useRef(performance.now())

  useEffect(() => {
    if (answered) return
    const t = setInterval(() => setElapsed(performance.now() - start.current), 500)
    return () => clearInterval(t)
  }, [answered])

  // Each next hint unlocks one more delay later (desirable difficulty).
  const nextDelay = shown < exercise.hints.length ? prefs.hintDelayMs * (shown + 1) : Infinity
  const waitSec = Math.max(0, Math.ceil((nextDelay - elapsed) / 1000))
  const canHint = shown < exercise.hints.length && waitSec === 0 && !answered

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen()) return
      // e.code, not e.key: on macOS Alt+H types a special character instead of "h".
      if (e.altKey && e.code === 'KeyH') {
        e.preventDefault()
        if (canHint) setShown((n) => n + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canHint])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!answered && text.trim()) onSubmit(text, shown)
  }

  return (
    <form onSubmit={submit}>
      <label className="sr-only" htmlFor="answer">
        Cevabın
      </label>
      <div className="answer-wrap">
      <input
        id="answer"
        className={`answer-input${verdict ? ` is-${verdict}` : ''}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={answered}
        autoFocus
        placeholder="Cevabını yaz"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        lang={exercise.entryId.slice(0, 2)}
      />
      {/* Listening exercises test spelling what you hear, so no speaking shortcut there. */}
      {canListen() && !answered && exercise.skill !== 'listening' && (
        <button type="button" className={`mic-btn${hearing ? ' is-on' : ''}`} onClick={dictate} aria-label={hearing ? 'Dinlemeyi durdur' : 'Sesle cevap ver'}>
          🎤
        </button>
      )}
      </div>
      {shown > 0 && (
        <div className="hints">
          {exercise.hints.slice(0, shown).map((h, i) => (
            <p key={i} className="hint">
              {h}
            </p>
          ))}
        </div>
      )}
      {(!answered || pending) && (
        <div className="session-actions">
          <button className="btn" type="submit" disabled={!text.trim() || pending}>
            {pending ? 'Değerlendiriliyor…' : 'Kontrol et'}
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

const PRAISE = ['Harika!', 'Doğru!', 'Süper!', 'Aynen böyle!', 'Mükemmel!', 'Çok iyi!']

function Feedback({
  ev,
  entry,
  continueRef,
  onContinue,
  onOverride,
  xp,
  mnemonic,
  onMnemonic,
}: {
  xp?: number
  mnemonic?: 'offer' | 'open' | 'saved' | null
  onMnemonic?: () => void
  ev: Graded
  entry: VocabularyEntry
  continueRef: React.RefObject<HTMLButtonElement | null>
  onContinue: () => void
  onOverride?: () => void
}) {
  const [praise] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)])
  const cls = ev.verdict === 'correct' ? 'ok' : ev.verdict
  const title = ev.verdict === 'correct' ? praise : ev.verdict === 'near' ? 'Çok yakın!' : 'Olsun, doğrusu:'
  const hint = ev.errorType && ev.verdict !== 'correct' ? ERROR_HINT[ev.errorType] : ''
  const btnClass = ev.verdict === 'correct' ? 'btn-ok' : ev.verdict === 'near' ? 'btn-near' : 'btn-bad'
  return (
    <div className={`sheet ${cls}`} role="status">
      <div className="sheet-inner">
        <div className="sheet-text">
          <p className="sheet-title">
            {ev.verdict === 'correct' ? <CheckIcon size={24} /> : <AlertIcon size={24} />}
            {title}
            {xp !== undefined && xp > 0 && <span className="xp-pop">+{xp} XP</span>}
          </p>
          {ev.verdict !== 'correct' && <p className="expected">{ev.expected}</p>}
          {ev.feedback ? <p className="small">{ev.feedback}</p> : hint && <p className="small">{hint}</p>}
          {ev.verdict !== 'correct' && entry.notes && <p className="small">💡 {entry.notes}</p>}
          <p className="small muted">
            {displayForm(entry)}: {entry.senses[0].gloss}
          </p>
        </div>
        <div className="row" style={{ gap: '0.75rem' }}>
          {mnemonic === 'offer' && (
            <button className="btn btn-quiet" onClick={onMnemonic}>
              💡 Hafıza ipucu oluştur
            </button>
          )}
          {mnemonic === 'saved' && <span className="small">💡 Not kaydedildi</span>}
          {onOverride && (
            <button className="link small" onClick={onOverride}>
              Cevabım da doğru
            </button>
          )}
          <button ref={continueRef} className={`btn btn-lg ${btnClass}`} onClick={onContinue}>
            Devam
          </button>
        </div>
      </div>
    </div>
  )
}

/** Consecutive non-wrong answers at the end of the log (introductions don't break a run). */
function comboOf(log: readonly SessionLogEntry[]): number {
  let n = 0
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].verdict === undefined) continue
    if (log[i].verdict === 'wrong') break
    n++
  }
  return n
}

/** Answer by saying the word aloud. */
function SpeakAnswer({
  language,
  answered,
  onHeard,
  onTypeInstead,
}: {
  language: VocabularyEntry['language']
  answered: boolean
  onHeard: (alternatives: string[]) => void
  onTypeInstead: () => void
}) {
  const [state, setState] = useState<'idle' | 'listening' | 'done'>('idle')
  const [heard, setHeard] = useState('')
  const [error, setError] = useState('')
  const stop = useRef<() => void>(() => {})
  useEffect(() => () => stop.current(), [])

  const start = () => {
    setError('')
    setHeard('')
    setState('listening')
    stop.current = listen(language, {
      onInterim: setHeard,
      onFinal: (alts) => {
        setHeard(alts[0] ?? '')
        setState('done')
        onHeard(alts)
      },
      onError: (m) => {
        setError(m)
        setState('idle')
      },
      onEnd: () => setState((s) => (s === 'listening' ? 'idle' : s)),
    })
  }

  return (
    <div className="speak-answer">
      <button className={`mic-big${state === 'listening' ? ' is-on' : ''}`} onClick={start} disabled={answered || state === 'listening'} aria-label="Konuş">
        🎤
      </button>
      <p className="heard">{heard ? `“${heard}”` : state === 'listening' ? 'Dinliyorum…' : 'Mikrofona dokun ve kelimeyi söyle'}</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!answered && (
        <button className="link small" onClick={onTypeInstead}>
          Yazarak cevapla
        </button>
      )}
    </div>
  )
}

/** Shortcuts are paused while a dialog is open. */
const modalOpen = () => !!document.querySelector('[aria-modal="true"]')

/** Shortcut reminder, only on devices with a hover-capable pointer (i.e. a real keyboard is likely). */
function KeyLegend() {
  return (
    <p className="kbd-legend" aria-hidden>
      <span><kbd>1</kbd>–<kbd>4</kbd> seç</span>
      <span><kbd>Enter</kbd> onayla</span>
      <span><kbd>Alt</kbd>+<kbd>S</kbd> dinle</span>
      <span><kbd>Alt</kbd>+<kbd>H</kbd> ipucu</span>
      <span><kbd>Esc</kbd> çık</span>
    </p>
  )
}
