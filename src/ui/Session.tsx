import { useEffect, useMemo, useRef, useState } from 'react'
import type { IntrusionSources } from '../engine/crossLanguage'
import type { PlanItem } from '../engine/dailyPlan'
import { buildExercise, displayForm, evaluateChoice, evaluateTyped, type Evaluation, type Exercise } from '../engine/exercises'
import { xpForAnswer } from '../engine/gamification'
import { MASTERY_STAGES, masteryStage } from '../engine/mastery'
import { markKnown, needsIntervention, newWordState, processAttempt, type AttemptInput } from '../engine/review'
import { listeningRate } from '../engine/listening'
import { createRng, type Rng } from '../engine/rng'
import type { Scheduler } from '../engine/scheduler'
import { adaptExercise, completeItem, currentItem, isFinished, mixInTyping, retryItem, skipRemaining, startSession, summarize, typedFollowUp, TYPING_SHARE, type SessionLogEntry, type SessionSummary } from '../engine/session'
import { TARGET_LANGUAGES, type Confidence, type EngineOptions, type Mistake, type ReviewMode, type UserWordState, type VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { SAMPLE_WORDS } from '../data/seed'
import { addExample } from '../data/wordInput'
import { loadFrequency } from '../data/frequency'
import { LANGUAGE_NAME, PROMPT_TEXT } from './labels'
import { AiError, evaluateSentence, evaluateTranslation } from '../ai'
import { useAi } from './aiContext'
import { ConfirmDialog } from './Dialog'
import { MnemonicDialog } from './Mnemonic'
import { CloseIcon, FlameIcon, StarIcon } from './icons'
import { prefs } from './prefs'
import { sfx } from './sounds'
import { playWord, preloadRecording, speechPrefs } from './speech'
import { prefetchNatural } from './naturalVoice'
import { warmAudio } from '../data/audioCache'
import { KeyLegend, type Graded } from './session/shared'
import { Intro } from './session/Intro'
import { Prompt } from './session/Prompt'
import { Choices, TypedAnswer, SpeakAnswer } from './session/Answers'
import { Feedback } from './session/Feedback'
import { modalOpen } from './session/keys'

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
  const lastAnswer = useRef<{ before: UserWordState; bank: Mistake[]; input: AttemptInput; eventId: string } | null>(null)
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
  // Some recognition questions become typing (Settings → Yazma oranı); practice sessions keep their plan.
  const [session, setSession] = useState(() =>
    startSession(p.mode === 'practice' ? p.items : p.items.map((i) => mixInTyping(i, states.current.get(i.entryId), TYPING_SHARE[prefs.typingShare], rng))),
  )
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

  const next = (log: Omit<SessionLogEntry, 'item'>, retry?: PlanItem, followUp?: PlanItem) =>
    setSession((s) => {
      const after = completeItem(s, log, retry, followUp)
      // 85 % rule: the coming item's format follows how the session is going.
      const up = after.items[after.index]
      const upEntry = up && byId.get(up.entryId)
      if (!up || !upEntry) return after
      const adapted = adaptExercise(up, upEntry, states.current.get(up.entryId), after.log.map((l) => l.verdict), rng, p.options)
      if (adapted === up) return after
      const items = [...after.items]
      items[after.index] = adapted
      return { ...after, items }
    })

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

  const answer = async (ev: Evaluation, responseMs: number, hintsUsed: number, maxHints: number, confidence?: Confidence) => {
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
    lastAnswer.current = { before, bank, input, eventId: result.event.id }
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

  const combo = comboOf(session.log)
  const sessionXp = session.log.reduce((sum, l) => sum + (l.xp ?? 0), 0)

  return (
    <div className="session">
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
          {answered > 0
            ? `Verdiğin ${answered} cevap kaydedildi. Kalan ${session.items.length - session.index} soru bugünkü görevinde bekleyecek.`
            : 'Henüz cevap vermedin; görev olduğu gibi bekleyecek.'}
        </ConfirmDialog>
      )}
      <div className="session-stage">
      {item.kind === 'introduce' ? (
        <Intro
          key={session.index}
          entry={entry}
          catalog={distractorPool}
          rng={rng}
          onContinue={() => introduce(false)}
          onKnown={() => introduce(true)}
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
          onContinue={proceed}
          struggling={() => needsIntervention(states.current.get(entry.id) ?? newWordState(entry, new Date()))}
          listenRate={listeningRate(speechPrefs.rate, states.current.get(entry.id)?.skills.listening?.stability)}
          intrusionSources={intrusionSources}
          onEntryUpdated={(updated) => setById((m) => new Map(m).set(updated.id, updated))}
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
  onContinue: (log: Omit<SessionLogEntry, 'item'>) => void
  /** Speech rate for listening exercises, adapted to how well the word is heard already. */
  listenRate: number
  intrusionSources?: IntrusionSources
  /** The word has been missed several times in a row: offer a memory hook. */
  struggling: () => boolean
  onEntryUpdated: (entry: VocabularyEntry) => void
}

/** With "strict accents" on, a missing accent is an error rather than a near miss. */
const strictAccents = (ev: Evaluation): Evaluation => (prefs.accentStrict && ev.errorType === 'accent' ? { ...ev, verdict: 'wrong' } : ev)


/** A typed answer graded by the app (not the AI) can be counted as right by the learner. */
const canOverride = (exercise: Exercise, ev: Evaluation) =>
  exercise.kind === 'typed' && exercise.type !== 'free_sentence' && exercise.type !== 'back_translation' && ev.verdict !== 'correct'

function ExerciseRunner({ entry, item, catalog, rng, onAnswer, onOverride, onContinue, struggling, onEntryUpdated, listenRate, intrusionSources }: RunnerProps) {
  const [mnemonic, setMnemonic] = useState<'offer' | 'open' | 'saved' | null>(null)
  const [typeInstead, setTypeInstead] = useState(false)
  const [exercise] = useState<Exercise>(() => buildExercise(item.exerciseType!, entry, catalog, rng))
  const startedAt = useRef(performance.now())
  const [result, setResult] = useState<{ ev: Graded; log: Omit<SessionLogEntry, 'item'>; chosen?: string; confidence?: Confidence } | null>(null)
  // Confidence is asked before the answer (not after: hindsight inflates it). Free sentences are
  // graded by the AI and spoken answers are hands-free, so those two skip it.
  const asksConfidence = prefs.confidence && exercise.type !== 'free_sentence' && exercise.type !== 'speak_word'
  const [unsure, setUnsure] = useState(false)
  const [pending, setPending] = useState(false)
  const [aiError, setAiError] = useState('')
  const { apiKey } = useAi()
  const continueBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (result) continueBtn.current?.focus()
  }, [result])

  const busy = useRef(false)

  const submit = async (
    ev: Graded,
    hintsUsed: number,
    maxHints: number,
    { chosen, ms = Math.round(performance.now() - startedAt.current), shift = false }: { chosen?: string; ms?: number; shift?: boolean } = {},
  ) => {
    // Guards against a double click/keypress recording the same answer twice.
    if (busy.current) return
    busy.current = true
    const confidence: Confidence | undefined = asksConfidence ? (unsure || shift ? 'unsure' : 'sure') : undefined
    const log = await onAnswer(ev, ms, hintsUsed, maxHints, confidence)
    setResult({ ev, log, chosen, confidence })
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

  return (
    <div>
      <p className="prompt-label">
        {exercise.type === 'typed_translation'
          ? `${LANGUAGE_NAME[entry.language]} karşılığını yaz`
          : exercise.type === 'speak_word'
            ? `${LANGUAGE_NAME[entry.language]} karşılığını söyle`
            : PROMPT_TEXT[exercise.type]}
      </p>
      <Prompt exercise={exercise} entry={entry} listenRate={listenRate} />
      {asksConfidence && !result && (
        <button
          type="button"
          className={`unsure-chip${unsure ? ' is-on' : ''}`}
          aria-pressed={unsure}
          onClick={() => {
            setUnsure((u) => !u)
            document.getElementById('answer')?.focus()
          }}
        >
          {unsure ? '✓ Emin değilim olarak işaretlendi' : '🤔 Emin değilim'}
          <span className="small muted">{unsure ? ' · şimdi cevabını seç' : ' · ya da Shift ile cevapla'}</span>
        </button>
      )}
      {exercise.kind === 'choice' ? (
        <Choices
          exercise={exercise}
          chosen={result?.chosen}
          answered={!!result}
          onChoose={(id, shift) => submit(evaluateChoice(exercise, id), 0, 0, { chosen: id, shift })}
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
              : submit(strictAccents(evaluateTyped(exercise, text, entry, catalog, intrusionSources)), hints, exercise.hints.length, { shift })
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
            entry={entry}
            mnemonic={mnemonic}
            onMnemonic={() => setMnemonic('open')}
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
