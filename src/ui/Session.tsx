import { formFeedback, TENSE_GUIDE } from '../engine/tenseGuide'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { IntrusionSources } from '../engine/crossLanguage'
import type { PlanItem } from '../engine/dailyPlan'
import { buildExercise, displayForm, evaluateChoice, evaluateTyped, type Evaluation, type Exercise } from '../engine/exercises'
import { xpForAnswer } from '../engine/gamification'
import { MASTERY_STAGES, masteryStage } from '../engine/mastery'
import { markKnown, needsIntervention, newWordState, processAttempt, type AttemptInput } from '../engine/review'
import { listeningRate } from '../engine/listening'
import { createRng, type Rng } from '../engine/rng'
import type { Scheduler } from '../engine/scheduler'
import { adaptExercise, completeItem, currentItem, isFinished, mixInTyping, retryItem, skipRemaining, startSession, suggestBreak, summarize, typedFollowUp, typeStrongCloze, TYPING_SHARE, type SessionLogEntry, type SessionSummary } from '../engine/session'
import { TARGET_LANGUAGES, type Confidence, type EngineOptions, type Mistake, type ReviewMode, type UserWordState, type VocabularyEntry, type Verdict } from '../engine/types'
import type { KelimeDB, Settings } from '../data/db'
import { SAMPLE_WORDS } from '../data/seed'
import { addExample } from '../data/wordInput'
import { loadFrequency } from '../data/frequency'
import { LANGUAGE_NAME, PROMPT_TEXT } from './labels'
import { AiError, evaluateSentence, evaluateTranslation } from '../ai'
import { useAi } from './aiContext'
import { ConfirmDialog } from './Dialog'
import { BoltIcon, CheckIcon, CloseIcon, FlameIcon, GearIcon, HelpIcon, HourglassIcon, SlowIcon, StarIcon } from './icons'
import { applySettings, prefs } from './prefs'
import { sfx } from './sounds'
import { canSpeak, playWord, preloadRecording, speak, speechPrefs } from './speech'
import { prefetchNatural } from './naturalVoice'
import { warmAudio } from '../data/audioCache'
import { KeyLegend, type Graded } from './session/shared'
import { Intro } from './session/Intro'
import { FormQuestion } from './session/FormQuestion'
import { Prompt } from './session/Prompt'
import { showToast } from './toastFeed'
import { DifficultButton } from './DifficultButton'
import { isDifficult, withDifficult } from '../engine/difficult'
import { WordPlant } from './session/WordPlant'
import { Choices, TypedAnswer, SpeakAnswer } from './session/Answers'
import { Feedback } from './session/Feedback'
import { modalOpen } from './session/keys'

// Dialogs opened now and then during a session load when first opened, not with the session.
const MnemonicDialog = lazy(() => import('./Mnemonic').then((m) => ({ default: m.MnemonicDialog })))
const QuickEditDialog = lazy(() => import('./session/QuickEdit').then((m) => ({ default: m.QuickEditDialog })))
const SessionSettings = lazy(() => import('./session/SessionSettings').then((m) => ({ default: m.SessionSettings })))

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
  /** Study settings, adjustable from the session's gear button. */
  settings?: Settings
  onSettings?: (s: Settings) => void
  /** A verb lab form mixed into the day was answered (it goes to the lab's own review). */
  onFormAnswer?: (form: NonNullable<PlanItem['form']>, ok: boolean, given: string) => void
}

/** Keeps the phone screen on during a session (where supported); re-taken after switching apps. */
function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let alive = true
    const take = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock
        .request('screen')
        .then((l) => (alive ? (lock = l) : void l.release()))
        .catch(() => {})
    }
    take()
    document.addEventListener('visibilitychange', take)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', take)
      void lock?.release()
    }
  }, [])
}

export function SessionScreen(p: Props) {
  useWakeLock()
  // State, not memo: an override can add an accepted spelling to a word mid-session.
  const [byId, setById] = useState(() => new Map(p.vocabulary.map((e) => [e.id, e])))
  /** The last answer, kept so "my answer was right too" can recompute it from the prior state. */
  const lastAnswer = useRef<{ before: UserWordState; hadState: boolean; bank: Mistake[]; input: AttemptInput; eventId: string } | null>(null)
  const states = useRef(new Map(p.states.map((s) => [s.entryId, s])))
  const mistakes = useRef(p.mistakes)
  // Distractors may come from the sample set too, so options are full even with few own words.
  const distractorPool = useMemo(() => {
    const own = new Set(p.vocabulary.map((v) => v.id))
    // A mixed session spans languages: samples for each one present.
    const langs = [...new Set(p.vocabulary.map((v) => v.language))]
    return [...p.vocabulary, ...langs.flatMap((l) => SAMPLE_WORDS[l].filter((w) => !own.has(w.id)))]
  }, [p.vocabulary])
  const rng = useMemo(() => createRng(p.seed ^ 0x5bd1e995), [p.seed])
  // Words of the other languages, to recognise an answer given in the wrong language.
  const [intrusionSources, setIntrusionSources] = useState<IntrusionSources>()
  useEffect(() => {
    const lang = p.vocabulary[0]?.language
    if (!lang) return
    let live = true
    const others = TARGET_LANGUAGES.filter((l) => l !== lang)
    Promise.all([p.db.vocabulary.where('language').anyOf(others).toArray(), ...TARGET_LANGUAGES.map(loadFrequency)]).then(([otherWords, ...maps]) => {
      if (!live) return
      const lists = Object.fromEntries(TARGET_LANGUAGES.map((l, i) => [l, new Set(maps[i].keys())]))
      setIntrusionSources({ others: otherWords, lists })
    })
    return () => {
      live = false
    }
  }, [p.db, p.vocabulary])
  // Own recordings are loaded up front: Safari only plays audio started directly by a click.
  useEffect(() => {
    const ids = new Set(p.items.map((i) => i.entryId))
    for (const v of p.vocabulary) {
      if (!ids.has(v.id)) continue
      if (v.audioId) void preloadRecording(v.audioId)
      else {
        // A native recording kept on the device plays at once (and offline).
        if (v.audioUrl) warmAudio([v.audioUrl])
        prefetchNatural(displayForm(v), v.language, speechPrefs.rate)
      }
    }
  }, [p.items, p.vocabulary])
  // Some recognition questions become typing (Settings → Yazma oranı), and a well-known word's
  // blank is typed instead of chosen; practice sessions keep their plan.
  const shape = (it: PlanItem, st: UserWordState | undefined) => {
    const mixed = mixInTyping(it, st, TYPING_SHARE[prefs.typingShare], rng)
    return prefs.typedBlanks ? typeStrongCloze(mixed, st) : mixed
  }
  const [session, setSession] = useState(() =>
    startSession(p.mode === 'practice' || !p.items.length ? p.items : [shape(p.items[0], states.current.get(p.items[0].entryId)), ...p.items.slice(1)]),
  )
  const item = currentItem(session)
  const { onFinish } = p
  // The verdict of a lab form on screen, logged when the learner moves on.
  const formVerdict = useRef<Verdict | undefined>(undefined)

  useEffect(() => {
    if (isFinished(session)) onFinish(summarize(session))
  }, [session, onFinish])

  const { onQuit } = p
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const answered = session.log.filter((l) => l.verdict).length
  // The answer on screen is saved already but joins the log only on "Devam"; quitting counts it too.
  const [answeredAt, setAnsweredAt] = useState<number | null>(null)
  const onScreen = answeredAt === session.index ? 1 : 0
  // Offered once per session; "Devam edeyim" puts it away for good.
  const [breakDismissed, setBreakDismissed] = useState(false)
  const showBreak = !breakDismissed && answeredAt !== session.index && suggestBreak(session.log)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A dialog that is open (or closing on this same keypress) owns Esc.
      if (e.key === 'Escape' && !modalOpen()) setConfirmQuit(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!item) return null
  const form = item.form
  const found = byId.get(item.entryId)
  const progress = (session.index / session.items.length) * 100

  const next = (log: Omit<SessionLogEntry, 'item'>, retry?: PlanItem, followUp?: PlanItem) =>
    setSession((s) => {
      const after = completeItem(s, log, retry, followUp)
      // 85 % rule: the coming item's format follows how the session is going.
      const up = after.items[after.index]
      const upEntry = up && byId.get(up.entryId)
      if (!up || !upEntry) return after
      // Some recognition questions become typing (Settings → Yazma oranı), decided as each one comes up.
      const mixed = p.mode === 'practice' || up.reason === 'practice' ? up : shape(up, states.current.get(up.entryId))
      const adapted = adaptExercise(mixed, upEntry, states.current.get(up.entryId), after.log.map((l) => l.verdict), rng, p.options)
      if (adapted === up) return after
      const items = [...after.items]
      items[after.index] = adapted
      return { ...after, items }
    })

  if (!found && !form) {
    // The word was deleted after the plan was built.
    queueMicrotask(() => next({ entryId: item.entryId }))
    return null
  }
  // A lab form has no word: the word-only actions below are never reached for it.
  const entry = found as VocabularyEntry

  const introduce = async (known = false) => {
    const now = new Date()
    let state = states.current.get(entry.id) ?? newWordState(entry, now)
    if (known) state = markKnown(state, p.scheduler, now)
    states.current.set(entry.id, state)
    await p.db.wordStates.put(state)
    if (known) setSession((s) => skipRemaining(completeItem(s, { entryId: entry.id }), entry.id))
    else next({ entryId: entry.id })
  }

  const answer = async (ev: Evaluation, responseMs: number, hintsUsed: number, maxHints: number, confidence?: Confidence) => {
    setAnsweredAt(session.index)
    const hadState = states.current.has(entry.id)
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
      // Graduated follow-ups of a new word are practice: they help memory, not the schedule.
      mode: item.reason === 'practice' ? 'practice' : p.mode,
      confidence,
    }
    const bank = mistakes.current
    const result = processAttempt(before, input, bank, p.scheduler)
    states.current.set(entry.id, result.state)
    mistakes.current = result.mistakes
    await p.db.saveReview(result)
    lastAnswer.current = { before, hadState, bank, input, eventId: result.event.id }
    const runBefore = comboOf(session.log)
    const xp = xpForAnswer({ exerciseType: input.exerciseType, verdict: ev.verdict, hintsUsed, responseMs, mode: input.mode ?? p.mode, combo: runBefore })
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

  /** "I tapped the wrong option": the answer is taken back as if it never happened. */
  const discard = async (): Promise<boolean> => {
    const last = lastAnswer.current
    if (!last) return false
    await p.db.revertReview(last.eventId, last.hadState ? last.before : null, entry.id, last.bank)
    if (last.hadState) states.current.set(entry.id, last.before)
    else states.current.delete(entry.id)
    mistakes.current = last.bank
    lastAnswer.current = null
    setAnsweredAt(null)
    return true
  }

  const proceed = (log: Omit<SessionLogEntry, 'item'>) => {
    const state = states.current.get(entry.id)
    const retry = log.verdict === 'wrong' && state ? retryItem(item, entry, state, rng, p.options) : undefined
    // A new word answered right comes back a little later in another format (graduated recall).
    // The second comeback is typed: picked out twice, now produced from its meaning.
    const comebacks = session.followUps?.[entry.id] ?? 0
    const followUp =
      log.verdict && log.verdict !== 'wrong' && state ? (comebacks >= 1 ? typedFollowUp(item) : retryItem(item, entry, state, rng, p.options)) : undefined
    next(log, retry, followUp)
  }

  // The lightning mark, kept on the word itself, so a hard word is gathered for a practice of its own.
  const markDifficult = async (on: boolean) => {
    const updated = withDifficult(entry, on)
    await p.db.vocabulary.put(updated)
    setById((m) => new Map(m).set(updated.id, updated))
    showToast(on ? 'Zor kelimelere eklendi: ayrı çalışmada toplanır.' : 'Zor işareti kaldırıldı.')
  }
  const combo = comboOf(session.log)
  const sessionXp = session.log.reduce((sum, l) => sum + (l.xp ?? 0), 0)

  return (
    <div className="session">
      <div className="session-top">
        <button className="icon-btn" onClick={() => setConfirmQuit(true)} aria-label="Oturumu bitir">
          <CloseIcon size={22} />
        </button>
        {/* One segment per question, coloured by why it is here; done ones solid, the rest faint. */}
        <div className="progress progress-segments" role="progressbar" aria-label="Oturumun ilerlemesi" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          {session.items.length <= 60 ? (
            session.items.map((it, i) => <span key={i} className={`seg seg-${it.kind === 'introduce' ? 'new' : it.reason}${i < session.index ? ' is-done' : ''}${i === session.index ? ' is-now' : ''}`} />)
          ) : (
            <div style={{ width: `${Math.max(progress, 3)}%` }} />
          )}
        </div>
        {combo >= 3 ? (
          <span className="combo" key={combo} data-tier={combo >= 10 ? 3 : combo >= 5 ? 2 : 1} data-burst={combo === 5 || combo === 10 || combo === 20 ? '' : undefined}>
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
        {!form && <DifficultButton marked={isDifficult(entry)} onToggle={() => void markDifficult(!isDifficult(entry))} />}
        {p.settings && p.onSettings && (
          <button className="icon-btn session-gear" onClick={() => setShowSettings(true)} aria-label="Çalışma ayarları" title="Çalışma ayarları">
            <GearIcon size={20} />
          </button>
        )}
      </div>
      {showSettings && p.settings && p.onSettings && (
        <Suspense fallback={null}>
          <SessionSettings
            settings={p.settings}
            onChange={(s) => {
              applySettings(s)
              p.onSettings!(s)
            }}
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
      )}
      {showBreak && (
        <div className="break-note" role="status">
          <p>
            <strong>Kısa bir ara iyi gelebilir.</strong> Son cevaplarda zorlanıyorsun. Aynı süreyi tek oturuma sıkıştırmak yerine araya mola koymak daha kalıcı öğretir; kalan sorular bugünkü görevinde bekler.
          </p>
          <div className="break-actions">
            <button className="btn btn-quiet" onClick={() => p.onFinish(summarize(session))}>
              Ara ver
            </button>
            <button className="link" onClick={() => setBreakDismissed(true)}>
              Devam edeyim
            </button>
          </div>
        </div>
      )}
      {p.mode === 'practice' && (
        <p className="practice-badge">
          <span className="badge">Serbest pratik</span>
        </p>
      )}
      {confirmQuit && (
        <ConfirmDialog
          title="Oturumdan çıkılsın mı?"
          confirmLabel="Çık"
          cancelLabel="Devam et"
          danger
          onConfirm={onQuit}
          onCancel={() => setConfirmQuit(false)}
        >
          {answered + onScreen > 0
            ? `Verdiğin ${answered + onScreen} cevap kaydedildi. Kalan ${session.items.length - session.index - onScreen} soru bugünkü görevinde bekleyecek.`
            : 'Henüz cevap vermedin; görev olduğu gibi bekleyecek.'}
        </ConfirmDialog>
      )}
      <div className="session-stage">
      {form ? (
        <FormQuestion
          key={session.index}
          form={form}
          onAnswered={(ok, given) => {
            setAnsweredAt(session.index)
            formVerdict.current = ok ? 'correct' : 'wrong'
            p.onFormAnswer?.(form, ok, given)
          }}
          onContinue={() => next({ entryId: item.entryId, verdict: formVerdict.current })}
        />
      ) : item.kind === 'introduce' ? (
        <Intro
          key={session.index}
          entry={entry}
          catalog={distractorPool}
          rng={rng}
          onContinue={() => introduce(false)}
          onKnown={() => introduce(true)}
          onPretestOff={p.settings && p.onSettings ? () => { const next = { ...p.settings!, pretest: false }; applySettings(next); p.onSettings!(next); showToast('Yeni kelimeler artık önce kart olarak gösterilecek. Geri açmak için Ayarlar > Sorular.') } : undefined}
          onOwnSentence={async (text) => {
            const updated = addExample(entry, text, '', true)
            await p.db.vocabulary.put(updated)
            setById((m) => new Map(m).set(updated.id, updated))
          }}
        />
      ) : (
        <ExerciseRunner
          key={session.index}
          entry={entry}
          item={item}
          catalog={distractorPool}
          rng={rng}
          onAnswer={answer}
          onOverride={override}
          onDiscard={discard}
          onContinue={proceed}
          struggling={() => needsIntervention(states.current.get(entry.id) ?? newWordState(entry, new Date()))}
          wordState={() => states.current.get(entry.id)}
          listenRate={listeningRate(speechPrefs.rate, states.current.get(entry.id)?.skills.listening?.stability)}
          intrusionSources={intrusionSources}
          onEntryUpdated={(updated) => setById((m) => new Map(m).set(updated.id, updated))}
          onToggleDifficult={() => void markDifficult(!isDifficult(entry))}
        />
      )}
      </div>
    </div>
  )
}


interface RunnerProps {
  entry: VocabularyEntry
  item: PlanItem
  catalog: VocabularyEntry[]
  rng: Rng
  onAnswer: (ev: Evaluation, responseMs: number, hintsUsed: number, maxHints: number, confidence?: Confidence) => Promise<Omit<SessionLogEntry, 'item'>>
  onOverride: () => Promise<Omit<SessionLogEntry, 'item'> | null>
  onDiscard: () => Promise<boolean>
  onContinue: (log: Omit<SessionLogEntry, 'item'>) => void
  /** Speech rate for listening exercises, adapted to how well the word is heard already. */
  listenRate: number
  intrusionSources?: IntrusionSources
  /** The word has been missed several times in a row: offer a memory hook. */
  struggling: () => boolean
  /** The word's memory right now (read on each render, so it shows the answer's effect). */
  wordState: () => UserWordState | undefined
  onEntryUpdated: (entry: VocabularyEntry) => void
  onToggleDifficult: () => void
}

/** With "strict accents" on, a missing accent is an error rather than a near miss. */
const strictAccents = (ev: Evaluation): Evaluation => (prefs.accentStrict && ev.errorType === 'accent' ? { ...ev, verdict: 'wrong' } : ev)


/** A typed answer graded by the app (not the AI) can be counted as right by the learner. */
const canOverride = (exercise: Exercise, ev: Evaluation) =>
  exercise.kind === 'typed' && exercise.type !== 'free_sentence' && exercise.type !== 'back_translation' && ev.verdict !== 'correct'

function ExerciseRunner({ entry, item, catalog, rng, onAnswer, onOverride, onDiscard, onContinue, struggling, wordState, onEntryUpdated, onToggleDifficult, listenRate, intrusionSources }: RunnerProps) {
  const [mnemonic, setMnemonic] = useState<'offer' | 'open' | 'saved' | null>(null)
  const [editing, setEditing] = useState(false)
  const [typeInstead, setTypeInstead] = useState(false)
  const [exercise] = useState<Exercise>(() => {
    const ex = buildExercise(item.exerciseType!, entry, catalog, rng, { productionReps: wordState()?.skills.production?.reps, skipPersons: prefs.hideVosotros ? [4] : undefined })
    return item.firstLetter && ex.kind === 'typed' && ex.context ? { ...ex, blankStart: ex.accepted[0]?.charAt(0) } : ex
  })
  const startedAt = useRef(performance.now())
  const [result, setResult] = useState<{ ev: Graded; log: Omit<SessionLogEntry, 'item'>; chosen?: string; confidence?: Confidence; forgot?: boolean } | null>(null)
  // Confidence is asked before the answer (not after: hindsight inflates it). Free sentences are
  // graded by the AI and spoken answers are hands-free, so those two skip it.
  const asksConfidence = prefs.confidence && exercise.type !== 'free_sentence' && exercise.type !== 'speak_word'
  // Listening to a sentence: a slow replay, offered as a small icon beside "Emin değilim".
  const slowable = exercise.type === 'dictation' && !!exercise.audioText && canSpeak()
  const [unsure, setUnsure] = useState(false)
  const [pending, setPending] = useState(false)
  const [aiError, setAiError] = useState('')
  const { apiKey } = useAi()
  const continueBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (result) continueBtn.current?.focus()
  }, [result])

  const busy = useRef(false)

  // A past-tense choice names the time words that settled it, right or wrong.
  const withCue = (ev: Graded): Graded => {
    if (exercise.type !== 'aspect_choice' || !exercise.cue || !exercise.tense) return ev
    const g = TENSE_GUIDE[exercise.tense]
    return { ...ev, feedback: `“${exercise.cue}” → ${g.name}: ${g.short}` }
  }

  // A conjugation answer that is another tense or person of the verb says which one it was.
  const namedForm = (ev: Graded, text: string): Graded => {
    if (exercise.type !== 'conjugation' || ev.errorType !== 'form' || !exercise.tense || ev.feedback) return ev
    const feedback = formFeedback(entry, exercise.tense, text)
    return feedback ? { ...ev, feedback } : ev
  }

  const submit = async (
    ev: Graded,
    hintsUsed: number,
    maxHints: number,
    { chosen, ms = Math.round(performance.now() - startedAt.current), shift = false, forgot = false }: { chosen?: string; ms?: number; shift?: boolean; forgot?: boolean } = {},
  ) => {
    // Guards against a double click/keypress recording the same answer twice.
    if (busy.current) return
    busy.current = true
    // Forgotten outright is no guess either way: no "you were sure" scolding, no "you guessed" note.
    const confidence: Confidence | undefined = asksConfidence && !forgot ? (unsure || shift ? 'unsure' : 'sure') : undefined
    const log = await onAnswer(ev, ms, hintsUsed, maxHints, confidence)
    setResult({ ev, log, chosen, confidence, ...(forgot ? { forgot: true } : {}) })
    if (ev.verdict === 'wrong' && struggling()) setMnemonic('offer')
    if (exercise.type !== 'listen_type' && exercise.type !== 'listen_choose') return
    playWord(entry, undefined, true, listenRate)
  }

  /** Free sentences are graded by the AI; time is measured up to submission, not the network wait. */
  const submitSentence = async (text: string, hints: number) => {
    if (!apiKey || pending) return
    const ms = Math.round(performance.now() - startedAt.current)
    setPending(true)
    setAiError('')
    try {
      const reference = exercise.kind === 'typed' && exercise.type === 'back_translation' ? exercise.accepted[0] : ''
      const g = reference
        ? await evaluateTranslation(apiKey, entry, exercise.prompt, reference, text.trim())
        : await evaluateSentence(apiKey, entry, text.trim())
      await submit(
        {
          verdict: g.verdict,
          errorType: g.errorType,
          given: text.trim(),
          expected: g.corrected,
          feedback: reference ? `${g.feedback} Örnek çeviri: ${reference}` : g.feedback,
        },
        hints,
        exercise.kind === 'typed' ? exercise.hints.length : 0,
        { ms },
      )
    } catch (e) {
      setAiError(e instanceof AiError ? e.message : 'Değerlendirme yapılamadı.')
    } finally {
      setPending(false)
    }
  }

  /** "Unuttum": nothing comes to mind. The answer is shown, it counts as a miss (back soon), and no wrong guess is recorded. */
  const canForget = !result && !pending && exercise.type !== 'free_sentence' && exercise.type !== 'back_translation'
  const forget = () => {
    if (!canForget) return
    const note = 'Bakarak öğrenmek de öğrenmektir: bu kelime birazdan bir kez daha gelecek.'
    if (exercise.kind === 'choice') {
      const expected = exercise.options.find((o) => o.id === exercise.correctOptionId)!.label
      void submit({ verdict: 'wrong', errorType: 'meaning', given: '', expected, feedback: note }, 0, 0, { forgot: true })
    } else {
      void submit({ verdict: 'wrong', errorType: 'meaning', given: '', expected: exercise.accepted[0], feedback: note }, 0, exercise.kind === 'typed' ? exercise.hints.length : 0, { forgot: true })
    }
  }
  useEffect(() => {
    if (!canForget) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'KeyU') {
        e.preventDefault()
        forget()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="prompt-head">
        <p className="prompt-label">
          {exercise.type === 'typed_translation'
            ? `${LANGUAGE_NAME[entry.language]} karşılığını yaz`
            : exercise.type === 'speak_word'
              ? `${LANGUAGE_NAME[entry.language]} karşılığını söyle`
              : PROMPT_TEXT[exercise.type]}
        </p>
        <WordPlant state={wordState()} />
      </div>
      <Prompt exercise={exercise} entry={entry} listenRate={listenRate} />
      {(!result || slowable) && (
      <div className="prompt-tools">
      {asksConfidence && !result && (
        <button
          type="button"
          className={`unsure-chip${unsure ? ' is-on' : ''}`}
          aria-pressed={unsure}
          title="Kısayol: cevabı Shift ile seç"
          onClick={() => {
            setUnsure((u) => !u)
            document.getElementById('answer')?.focus()
          }}
        >
          {unsure ? <CheckIcon size={15} className="inline-icon" /> : <HelpIcon size={15} className="inline-icon" />}
          Emin değilim
          {unsure && <span className="small muted"> · şimdi cevabını seç</span>}
        </button>
      )}
      {canForget && (
        <button type="button" className="unsure-chip forgot-chip" title="Hiçbir şey aklıma gelmiyor: cevabı göster (Alt + U)" onClick={forget}>
          <HourglassIcon size={15} className="inline-icon" />
          Unuttum
        </button>
      )}
      {!result && (
        <button type="button" className={`unsure-chip difficult-chip${isDifficult(entry) ? ' is-on' : ''}`} aria-pressed={isDifficult(entry)} title="Zor diye işaretle: bu kelimeleri ayrı bir çalışmada toplarız" onClick={onToggleDifficult}>
          <BoltIcon size={15} className="inline-icon" solid={isDifficult(entry)} />
          Zor
        </button>
      )}
      {slowable && (
        <button type="button" className="unsure-chip tool-chip" aria-label="Yavaş dinle" title="Yavaş dinle" onClick={() => speak(exercise.audioText!, entry.language, 0.7, true)}>
          <SlowIcon size={17} />
        </button>
      )}
      </div>
      )}
      {exercise.kind === 'choice' ? (
        <Choices
          exercise={exercise}
          chosen={result?.chosen}
          answered={!!result}
          lang={entry.language}
          onChoose={(id, shift) => submit(withCue(evaluateChoice(exercise, id)), 0, 0, { chosen: id, shift })}
        />
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
                .map((a) => evaluateTyped(exercise, a, entry, catalog, intrusionSources))
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
          onSubmit={(text, hints, shift) =>
            exercise.type === 'free_sentence' || exercise.type === 'back_translation'
              ? submitSentence(text, hints)
              : submit(namedForm(strictAccents(evaluateTyped(exercise, text, entry, catalog, intrusionSources)), text), hints, exercise.hints.length, { shift })
          }
        />
        )
      )}
      {mnemonic === 'open' && (
        <Suspense fallback={null}>
        <MnemonicDialog
          entry={entry}
          reason="Bu kelimeye birkaç kez takıldın; bir hafıza ipucu deneyelim."
          onClose={() => setMnemonic('offer')}
          onSaved={(updated) => {
            onEntryUpdated(updated)
            setMnemonic('saved')
          }}
        />
        </Suspense>
      )}
      {editing && (
        <Suspense fallback={null}>
        <QuickEditDialog
          entry={entry}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            onEntryUpdated(updated)
            setEditing(false)
            showToast('Kelime düzeltildi')
          }}
        />
        </Suspense>
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
      {/* Outside the feedback sheet: its entrance animation would carry a fixed child along. */}
      <KeyLegend
        mode={result ? 'answered' : exercise.kind === 'choice' ? 'choice' : 'typed'}
        hints={exercise.kind === 'typed' && exercise.hints.length > 0}
        override={!!result && canOverride(exercise, result.ev)}
      />
      {result && (
        <>
          <div className="sheet-spacer" />
          <Feedback
            ev={result.ev}
            confidence={result.confidence}
            grew={
              result.log.stageAfter && result.log.stageBefore && MASTERY_STAGES.indexOf(result.log.stageAfter) > MASTERY_STAGES.indexOf(result.log.stageBefore)
                ? result.log.stageAfter
                : undefined
            }
            xp={result.log.xp}
            forgot={result.forgot}
            entry={entry}
            mnemonic={mnemonic}
            onMnemonic={() => setMnemonic('open')}
            onEdit={() => setEditing(true)}
            continueRef={continueBtn}
            onContinue={() => onContinue(result.log)}
            onOverride={
              canOverride(exercise, result.ev)
                ? async () => {
                    const log = await onOverride()
                    if (log) setResult({ ...result, log, ev: { ...result.ev, verdict: 'correct', errorType: undefined, feedback: 'Doğru sayıldı. Bu yazımı bundan sonra kabul edeceğim.' } })
                  }
                : undefined
            }
            onDiscard={
              exercise.kind === 'choice' && result.ev.verdict === 'wrong' && !result.forgot
                ? async () => {
                    // Not counted: no verdict in the log, so no retry and no follow-up either.
                    if (await onDiscard()) onContinue({ entryId: entry.id })
                  }
                : undefined
            }
          />
        </>
      )}
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
