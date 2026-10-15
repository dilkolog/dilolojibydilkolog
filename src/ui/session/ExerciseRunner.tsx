import { formFeedback, TENSE_GUIDE } from '../../engine/tenseGuide'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { IntrusionSources } from '../../engine/crossLanguage'
import type { PlanItem } from '../../engine/dailyPlan'
import { buildExercise, evaluateChoice, evaluateTyped, type Evaluation, type Exercise } from '../../engine/exercises'
import { MASTERY_STAGES } from '../../engine/mastery'
import type { Rng } from '../../engine/rng'
import type { SessionLogEntry } from '../../engine/session'
import type { Confidence, ExerciseType, UserWordState, VocabularyEntry } from '../../engine/types'
import { LANGUAGE_NAME, PROMPT_TEXT } from '../labels'
import { AiError, evaluateSentence, evaluateTranslation } from '../../ai'
import { useAi } from '../aiContext'
import { BoltIcon, CheckIcon, HelpIcon, HourglassIcon, SlowIcon } from '../icons'
import { prefs } from '../prefs'
import { canSpeak, playWord, speak } from '../speech'
import { KeyLegend, type Graded } from './shared'
import { Prompt } from './Prompt'
import { showToast } from '../toastFeed'
import { PREF_TYPES } from '../../engine/exercisePrefs'
import { isDifficult } from '../../engine/difficult'
import { WordPlant } from './WordPlant'
import { Choices, TypedAnswer, SpeakAnswer } from './Answers'
import { Feedback } from './Feedback'

const MnemonicDialog = lazy(() => import('../Mnemonic').then((m) => ({ default: m.MnemonicDialog })))
const QuickEditDialog = lazy(() => import('./QuickEdit').then((m) => ({ default: m.QuickEditDialog })))

export interface RunnerProps {
  /** Right answers in a row so far (the one just given included, once answered). */
  combo: number
  /** Turns the share of a kind of question down or off (from the feedback after a miss). */
  onTypePref?: (type: ExerciseType, name: string, level: 'less' | 'off') => void
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

/** One question of the session: asks it, grades the answer, then shows the feedback and what can be done next. */
export function ExerciseRunner({ entry, item, catalog, rng, onAnswer, onOverride, onDiscard, onContinue, struggling, wordState, onEntryUpdated, onToggleDifficult, listenRate, intrusionSources, onTypePref, combo }: RunnerProps) {
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
  // The latest handler, so a re-render doesn't restart the wait below.
  const goOn = useRef(onContinue)
  goOn.current = onContinue
  // "Doğruda otomatik devam": a plain right answer (nothing to read below it) goes on by itself.
  useEffect(() => {
    if (!result || result.ev.verdict !== 'correct' || result.ev.feedback || editing || mnemonic || !prefs.autoAdvance) return
    const t = setTimeout(() => goOn.current(result.log), prefs.autoAdvance * 1000)
    return () => clearTimeout(t)
  }, [result, editing, mnemonic])

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
    let log: Omit<SessionLogEntry, 'item'>
    try {
      log = await onAnswer(ev, ms, hintsUsed, maxHints, confidence)
    } catch {
      // Not saved (storage full, database closed): said, and the same question can be answered again.
      busy.current = false
      showToast('Cevabın kaydedilemedi: cihazın depolaması dolu olabilir. Biraz yer açıp tekrar dene.', undefined, 7000, 'info')
      return
    }
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

  /** The kind of question on screen, when the learner can tune its share (Settings → Sorular). */
  const tunableType = PREF_TYPES.find((t) => t.type === exercise.type)
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
            combo={combo}
            forgot={result.forgot}
            typeName={tunableType?.name}
            onTypePref={tunableType && onTypePref ? (level) => onTypePref(tunableType.type, tunableType.name, level) : undefined}
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
