import '../../lazy.css'
import { ANIMATED_MONKI } from '../shared/drawnArt'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { IntrusionSources } from '../../engine/crossLanguage'
import type { PlanItem } from '../../engine/dailyPlan'
import { displayForm, type Evaluation } from '../../engine/exercises'
import { COMEBACK_MIN_ANSWERS, COMEBACK_XP, isComeback, nextCombo, xpForAnswer } from '../../engine/gamification'
import { masteryStage } from '../../engine/mastery'
import { localDate } from '../../engine/progress'
import { leechHelp } from '../../engine/leechHelp'
import { markKnown, needsIntervention, newWordState, processAttempt, type AttemptInput } from '../../engine/review'
import { listeningRate } from '../../engine/listening'
import { createRng } from '../../engine/rng'
import type { Scheduler } from '../../engine/scheduler'
import { AWAY_DAYS, daysAway, easiestWords, struggling } from '../../engine/easyRound'
import { advanceLearning, attemptMode, learningSteps, sessionProgress, adaptExercise, completeItem, currentItem, honorOff, insertLater, isFinished, mixInTyping, skipRemaining, startSession, suggestBreak, summarize, typeStrongCloze, TYPING_SHARE, type SessionLogEntry, type SessionSummary } from '../../engine/session'
import { independentAnswer, learningDebts } from '../../engine/learningProgress'
import { draftRecord, writeSessionDraft } from '../../data/sessionDraft'
import { TARGET_LANGUAGES, timeOf, type Confidence, type EngineOptions, type ExerciseType, type Mistake, type ReviewMode, type UserWordState, type VocabularyEntry, type Verdict } from '../../engine/types'
import type { KelimeDB, Settings } from '../../data/db'
import { SAMPLE_WORDS } from '../../data/seed'
import { addExample } from '../../data/wordInput'
import { loadFrequency } from '../../data/frequency'
import { ConfirmDialog } from '../shared/Dialog'
import { CloseIcon, FlameIcon, GearIcon, StarIcon } from '../shared/icons'
import { applySettings, prefs } from '../prefs'
import { sfx } from '../shared/sounds'
import { useGame } from '../game'
import { preloadRecording, speechPrefs } from '../shared/speech'
import { prefetchNatural } from '../shared/naturalVoice'
import { warmAudio } from '../../data/audioCache'
import { Intro } from './Intro'
import { RefreshCard } from './RefreshCard'
import { FormQuestion } from './FormQuestion'
import { showToast, undoable } from '../shared/toastFeed'
import { effectivePrefs } from '../../engine/exercisePrefs'
import { blockedByPrefs } from '../../engine/exercises'
import { DifficultButton } from '../words/DifficultButton'
import { isDifficult, withDifficult } from '../../engine/difficult'
import { modalOpen } from './keys'

// Dialogs opened now and then during a session load when first opened, not with the session.
const SessionSettings = lazy(() => import('./SessionSettings').then((m) => ({ default: m.SessionSettings })))
import { ExerciseRunner } from './ExerciseRunner'

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
  initialSession?: import('../../engine/session').Session
  draftLanguage?: import('../../engine/types').TargetLanguage
  options: EngineOptions
  onFinish: (summary: SessionSummary) => void
  onQuit: () => void
  /** Study settings, adjustable from the session's gear button. */
  settings?: Settings
  onSettings?: (s: Settings) => void
  /** A verb lab form mixed into the day was answered (it goes to the lab's own review). */
  onFormAnswer?: (form: NonNullable<PlanItem['form']>, ok: boolean, given: string) => void
}

/** A word that felt hard on its refresher card is asked once more this many items later. */
const STRUGGLE_GAP = 6

const startOfYesterday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - 1)
  return d.getTime()
}

/** Keeps the phone screen on during a session (where supported); re-taken after switching apps. */
function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
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
  }, [enabled])
}

export function SessionScreen(p: Props) {
  useWakeLock(p.settings?.keepAwake !== false)
  // State, not memo: an override can add an accepted spelling to a word mid-session.
  const [byId, setById] = useState(() => new Map(p.vocabulary.map((e) => [e.id, e])))
  /** The last answer, kept so "my answer was right too" can recompute it from the prior state. */
  const lastAnswer = useRef<{ before: UserWordState; hadState: boolean; bank: Mistake[]; input: AttemptInput; eventId: string } | null>(null)
  /** The session as it will be once the answer on screen is taken in (on "Devam"): what the plant's ring shows meanwhile. */
  const afterAnswer = useRef<{ index: number; session: import('../../engine/session').Session } | null>(null)
  const states = useRef(new Map(p.states.map((s) => [s.entryId, s])))
  const mistakes = useRef(p.mistakes)
  const introducing = useRef(false)
  /** Words already offered help this session (a chronic leech is offered once, not on every miss). */
  const offeredHelp = useRef(new Set<string>())
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
  /** Typing from the meaning is open to this word: not switched off, and its meaning is not a long definition when those are skipped. */
  const typedAllowed = (entryId: string) => {
    const word = byId.get(entryId)
    return !blockedByPrefs('typed_translation', word ?? ({ senses: [{ gloss: '' }] } as VocabularyEntry), { off: prefs.exerciseOff, skipLong: prefs.skipLongGloss })
  }
  const shape = (it: PlanItem, st: UserWordState | undefined) => {
    if (it.reason === 'new' || it.reason === 'practice') return it
    const mixed = mixInTyping(it, st, TYPING_SHARE[prefs.typingShare], rng, typedAllowed(it.entryId))
    return prefs.exerciseOff.includes('cloze_typed') ? mixed : typeStrongCloze(mixed, st)
  }
  const draftLanguage = p.draftLanguage ?? p.vocabulary[0]?.language ?? p.items[0]?.form?.language ?? 'en'
  const initialLogCount = useRef(p.initialSession?.log.length ?? 0)
  const [session, setSession] = useState(() => {
    const opts = { ...p.options, off: prefs.exerciseOff, skipLong: prefs.skipLongGloss }
    const kept = prefs.exerciseOff.includes('conjugation') ? p.items.filter((it) => !it.form) : p.items
    const honored = kept.map((it) => {
      const entry = byId.get(it.entryId)
      return entry ? honorOff(it, entry, states.current.get(it.entryId), rng, opts) : it
    })
    const initial = p.initialSession ? { ...p.initialSession, items: [...p.initialSession.items] } : startSession(honored)
    const first = currentItem(initial)
    const word = first && byId.get(first.entryId)
    if (first && word && p.mode !== 'practice') {
      const state = states.current.get(first.entryId)
      initial.items[initial.index] = honorOff(shape(first, state), word, state, rng, opts)
    }
    return initial
  })
  useEffect(() => {
    if (p.mode === 'normal') void writeSessionDraft(p.db, draftRecord(draftLanguage, p.seed, session)).catch(() => showToast('Tur kaydı güncellenemedi. Depolama alanını kontrol et.'))
  }, [session, p.db, p.mode, p.seed, draftLanguage])
  const item = currentItem(session)
  // The day's XP goal is reached in the middle of a round: said once, with the same little chime as a run of five.
  const dayGame = useGame()
  const earnedXp = session.log.slice(initialLogCount.current).reduce((sum, l) => sum + (l.xp ?? 0), 0)
  const dayGoal = p.settings?.dailyXpGoal ?? 0
  const goalSaid = useRef(false)
  // A session starts the right-answers climb from the bottom.
  useEffect(() => sfx.resetRun(), [])
  useEffect(() => {
    if (goalSaid.current || !dayGoal || !dayGame || p.mode !== 'normal') return
    if (dayGame.xp.today < dayGoal && dayGame.xp.today + earnedXp >= dayGoal) {
      goalSaid.current = true
      sfx.goal()
      showToast('Günlük XP hedefin tamam!')
    }
  }, [earnedXp, dayGoal, dayGame, p.mode])
  // What the day already holds, for the XP the answers earn: the answers given before this session (a long day pays less) and
  // whether today picks the studying up after a few days away (the fifth real answer then brings the comeback bonus).
  const today = useRef({ answers: 0, normal: 0, comeback: false, paid: false })
  const todayReady = useRef<Promise<void>>(Promise.resolve())
  // Days since the last studied day, when the first session of today opens after a long break (0 = no offer).
  const [awayFor, setAwayFor] = useState(0)
  useEffect(() => {
    let live = true
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    todayReady.current = (async () => {
      const [earlier, last] = await Promise.all([p.db.eventsSince(start), p.db.events.where('timestamp').below(start).filter((e) => e.mode === 'normal').last()])
      if (!live) return
      const away = daysAway(last ? localDate(last.timestamp) : null, localDate(start))
      if (away !== null && away >= AWAY_DAYS && earlier.length === 0) setAwayFor(away)
      today.current = { ...today.current, answers: earlier.length, normal: earlier.filter((e) => e.mode === 'normal').length, comeback: isComeback(last ? localDate(last.timestamp) : null, localDate(start)) }
    })().catch(() => {})
    return () => {
      live = false
    }
    // Once, when the session opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { onFinish } = p
  // Words whose refresher card was shown (or put away) in this session.
  const [refreshed, setRefreshed] = useState<ReadonlySet<string>>(() => new Set())
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
  // Three wrong in a row: a few easy questions are offered (once per session), unless the break note is up.
  const [easyDismissed, setEasyDismissed] = useState(false)
  const afterBreak = awayFor > 0 && session.log.every((l) => !l.verdict) && answeredAt !== session.index
  const showEasy = !easyDismissed && !showBreak && p.mode !== 'practice' && answeredAt !== session.index && (struggling(session.log) || afterBreak)
  const addEasy = () => {
    const current = currentItem(session)
    const exclude = new Set([...(current ? [current.entryId] : []), ...session.log.slice(-3).map((l) => l.entryId)])
    const ids = easiestWords(states.current.values(), byId, exclude)
    setEasyDismissed(true)
    if (!ids.length) {
      showToast('Şimdilik kolay soru için yeterince oturmuş kelime yok.')
      return
    }
    // The question on screen has not been answered yet: the easy ones go in front of it (gap -1 puts an item at the current place).
    setSession((s) => ids.reduce((acc, id, i) => insertLater(acc, { kind: 'exercise', entryId: id, reason: 'practice', skill: 'recognition', exerciseType: 'mc_meaning' }, i - 1), s))
  }
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
  const goal = sessionProgress(session)
  const progress = goal.percent

  const next = (log: Omit<SessionLogEntry, 'item'>) =>
    setSession((s) => {
      const current = currentItem(s)!
      const word = byId.get(current.entryId)
      const state = states.current.get(current.entryId)
      const after = word && state && log.verdict
        ? advanceLearning(s, log, word, state, createRng(p.seed + s.index), { ...p.options, off: prefs.exerciseOff, skipLong: prefs.skipLongGloss })
        : completeItem(s, log)
      // 85 % rule: the coming item's format follows how the session is going.
      const up = after.items[after.index]
      const upEntry = up && byId.get(up.entryId)
      if (!up || !upEntry) return after
      // Some recognition questions become typing (Settings → Yazma oranı), decided as each one comes up.
      const mixed = p.mode === 'practice' || up.reason === 'practice' ? up : shape(up, states.current.get(up.entryId))
      const adapted = adaptExercise(mixed, upEntry, states.current.get(up.entryId), after.log.map((l) => l.verdict), rng, p.options)
      // A type switched off in this session's settings applies to what is still to come, not only to the next plan.
      // Practice sessions too: a kind switched off is off everywhere.
      const final = honorOff(adapted, upEntry, states.current.get(up.entryId), rng, { ...p.options, off: prefs.exerciseOff, skipLong: prefs.skipLongGloss })
      if (final === up) return after
      const items = [...after.items]
      items[after.index] = final
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
    if (introducing.current) return
    introducing.current = true
    try {
      const now = new Date()
      let state = states.current.get(entry.id) ?? { ...newWordState(entry, now), learning: { recognition: { remaining: 0, delayed: false, at: now.toISOString(), sequence: 0 } } }
      if (known) state = markKnown(state, p.scheduler, now)
      const completed = completeItem(session, { entryId: entry.id })
      const after = known ? skipRemaining(completed, entry.id) : completed
      await p.db.transaction('rw', [p.db.wordStates, p.db.meta], async () => {
        await p.db.wordStates.put(state)
        if (p.mode === 'normal') await writeSessionDraft(p.db, draftRecord(draftLanguage, p.seed, after))
      })
      states.current.set(entry.id, state)
      if (known) setSession(after)
      else next({ entryId: entry.id })
    } catch {
      showToast('Kelime kaydedilemedi. Depolama alanını kontrol edip yeniden dene.')
    } finally {
      introducing.current = false
    }
  }

  // Only resume an unfinished introduction; revealing a learned word before its test cues the answer.
  const refreshDue = (it: PlanItem, e: VocabularyEntry) =>
    prefs.refreshCard &&
    p.mode === 'normal' &&
    it.kind === 'exercise' &&
    it.reason !== 'practice' &&
    !refreshed.has(e.id) &&
    // Never over an answer already given (answering gives a new word its state).
    answeredAt !== session.index &&
    !session.log.some((l) => l.entryId === e.id) &&
    Object.keys(states.current.get(e.id)?.skills ?? {}).length === 0 &&
    timeOf(states.current.get(e.id)?.introducedAt) >= startOfYesterday()

  const answer = async (ev: Evaluation, responseMs: number, hintsUsed: number, maxHints: number, confidence?: Confidence, forgot = false) => {
    setAnsweredAt(session.index)
    await todayReady.current
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
      // Repetitions preserve existing schedules; the first test of a new skill creates its card.
      mode: attemptMode(item, p.mode, before, { verdict: ev.verdict, hintsUsed, maxHints }),
      guided: p.mode === 'normal' && (item.learningBatch !== undefined || !!item.learningFollowUp || !hadState),
      recallExpected: typedAllowed(entry.id),
      confidence,
      plan: { reason: item.reason, slot: session.index, ...(item.probe !== undefined ? { probe: item.probe } : {}) },
    }
    const bank = mistakes.current
    const result = processAttempt(before, input, bank, p.scheduler)
    const runBefore = comboOf(session.log)
    const xp = xpForAnswer({
      exerciseType: input.exerciseType,
      verdict: ev.verdict,
      hintsUsed,
      responseMs,
      mode: input.mode ?? p.mode,
      combo: runBefore,
      retrievability: result.event.retrievabilityBefore,
      wordReviews: before.stats.reviews,
      wordWrong: before.stats.wrong,
      answersToday: today.current.answers + session.log.slice(initialLogCount.current).filter((l) => l.verdict !== undefined).length,
    })
    // The comeback bonus, with the day's fifth real answer (the same rule as `comebackBonus`).
    let bonus = 0
    if ((input.mode ?? p.mode) === 'normal') {
      const normal = today.current.normal + session.log.slice(initialLogCount.current).filter((l) => l.verdict !== undefined).length + 1
      if (today.current.comeback && !today.current.paid && normal >= COMEBACK_MIN_ANSWERS) {
        bonus = COMEBACK_XP
      }
    }
    const log: Omit<SessionLogEntry, 'item'> = {
      entryId: entry.id, verdict: ev.verdict, errorType: ev.errorType,
      stageBefore: masteryStage(before), stageAfter: masteryStage(result.state), xp: xp + bonus,
      independent: independentAnswer(input), responseMs, confidence,
    }
    const advanced = advanceLearning(session, log, entry, result.state, createRng(p.seed + session.index), { ...p.options, off: prefs.exerciseOff, skipLong: prefs.skipLongGloss })
    const checkpoint = p.mode === 'normal' ? draftRecord(draftLanguage, p.seed, advanced) : undefined
    // The saved answer and the next learning step commit together; reload never regrades it.
    try {
      await p.db.saveReview(result, checkpoint)
    } catch (e) {
      setAnsweredAt((a) => (a === session.index ? null : a))
      throw e
    }
    states.current.set(entry.id, result.state)
    mistakes.current = result.mistakes
    lastAnswer.current = { before, hadState, bank, input, eventId: result.event.id }
    afterAnswer.current = { index: session.index, session: advanced }
    if (bonus) {
      today.current.paid = true
      showToast(`Hoş geldin! Döndüğün için +${bonus} XP`)
    }
    const run = ev.verdict === 'wrong' ? 0 : strictRunOf(session.log) + 1
    if (forgot) sfx.forgot()
    else if (ev.verdict === 'wrong') sfx.wrong()
    else if (run === 5 || run === 10 || run === 20) sfx.combo()
    else if (ev.verdict === 'near') sfx.near()
    else sfx.correct()
    return log
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
    const xp = xpForAnswer({ exerciseType: input.exerciseType, verdict: 'correct', hintsUsed: input.hintsUsed, responseMs: input.responseMs, mode: input.mode ?? p.mode, combo: 0 })
    const log: Omit<SessionLogEntry, 'item'> = { entryId: entry.id, verdict: 'correct', stageBefore: masteryStage(last.before), stageAfter: masteryStage(result.state), xp, independent: independentAnswer(input), responseMs: input.responseMs, confidence: input.confidence }
    const advanced = advanceLearning(session, log, entry, result.state, createRng(p.seed + session.index), { ...p.options, off: prefs.exerciseOff, skipLong: prefs.skipLongGloss })
    const checkpoint = p.mode === 'normal' ? draftRecord(draftLanguage, p.seed, advanced) : undefined
    await p.db.replaceReview(last.eventId, result, stale, checkpoint)
    states.current.set(entry.id, result.state)
    afterAnswer.current = { index: session.index, session: advanced }
    mistakes.current = result.mistakes
    lastAnswer.current = { ...last, input, eventId: result.event.id }
    const given = last.input.given?.trim()
    if (given && (input.exerciseType === 'typed_translation' || input.exerciseType === 'listen_type')) {
      const updated = { ...entry, alternativeForms: [...new Set([...(entry.alternativeForms ?? []), given])] }
      setById((m) => new Map(m).set(entry.id, updated))
      await p.db.vocabulary.put(updated)
    }
    return log
  }

  /** A word that keeps failing is started over (progress and its recorded mistakes reset); "Geri al" brings all of it back. */
  const relearn = async (word: VocabularyEntry) => {
    const id = word.id
    const snap = await p.db.snapshotWords([id])
    await p.db.wordStates.delete(id)
    await p.db.mistakes.where('entryId').equals(id).delete()
    states.current.delete(id)
    mistakes.current = mistakes.current.filter((m) => m.entryId !== id)
    undoable(`“${displayForm(word)}” baştan öğrenilecek`, async () => {
      await p.db.restoreWords(snap)
      const back = await p.db.wordStates.get(id)
      if (back) states.current.set(id, back)
    })
  }

  /** "I tapped the wrong option": the answer is taken back as if it never happened. */
  const discard = async (): Promise<boolean> => {
    const last = lastAnswer.current
    if (!last) return false
    await p.db.revertReview(last.eventId, last.hadState ? last.before : null, entry.id, last.bank, p.mode === 'normal' ? draftRecord(draftLanguage, p.seed, session) : undefined)
    if (last.hadState) states.current.set(entry.id, last.before)
    else states.current.delete(entry.id)
    mistakes.current = last.bank
    lastAnswer.current = null
    afterAnswer.current = null
    setAnsweredAt(null)
    return true
  }

  /** A kind of question turned down or off from the feedback after a miss (Settings → Sorular), undoable. */
  const setTypePref = (type: ExerciseType, name: string, level: 'less' | 'off') => {
    const settings = p.settings
    if (!settings || !p.onSettings) return
    const prefs = { ...effectivePrefs(settings.exercisePrefs, settings.typedBlanks), [type]: level }
    const apply = (next: Settings) => {
      applySettings(next)
      p.onSettings!(next)
    }
    apply({ ...settings, exercisePrefs: prefs, typedBlanks: true })
    undoable(level === 'off' ? `“${name}” soruları artık sorulmayacak.` : `“${name}” soruları daha az sorulacak.`, () => apply(settings))
  }

  const proceed = (log: Omit<SessionLogEntry, 'item'>) => next(log)

  // The lightning mark, kept on the word itself, so a hard word is gathered for a practice of its own.
  const markDifficult = async (on: boolean) => {
    const updated = withDifficult(entry, on)
    await p.db.vocabulary.put(updated)
    setById((m) => new Map(m).set(updated.id, updated))
    showToast(on ? 'Zor kelimelere eklendi: ayrı çalışmada toplanır.' : 'Zor işareti kaldırıldı.')
  }
  /** A word guided in this session: its steps, counting the answer on screen once it is given (display only). */
  const stepsOf = (id: string, s = afterAnswer.current?.index === session.index ? afterAnswer.current.session : session) => {
    const state = states.current.get(id)
    return learningSteps(s, id, !!state && learningDebts(state).length > 0)
  }
  const combo = comboOf(session.log)
  const sessionXp = session.log.reduce((sum, l) => sum + (l.xp ?? 0), 0)

  return (
    <div className="session">
      <div className="session-top">
        <button className="icon-btn" onClick={() => setConfirmQuit(true)} aria-label="Oturumu bitir">
          <CloseIcon size={22} />
        </button>
        {/* A stable word goal: adding a repetition does not move progress backwards. */}
        <div className="progress" role="progressbar" aria-label="Oturumun ilerlemesi" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${progress}%` }} />
        </div>
        {combo >= 3 ? (
          <span className="combo" key={combo} data-tier={combo >= 10 ? 3 : combo >= 5 ? 2 : 1} data-burst={combo === 5 || combo === 10 || combo === 20 ? '' : undefined}>
            <FlameIcon size={18} /> {combo}
          </span>
        ) : (
          <span className="progress-count">
            {goal.completed}/{goal.total} kelime
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
            questionType={!form && item.kind === 'exercise' ? item.exerciseType : undefined}
            remaining={Math.max(0, session.items.length - session.index - 1)}
            onShorten={(n) => {
              // Keeps the current question and the next n; the rest of the day's plan is still there afterwards.
              setSession((s) => ({ ...s, items: s.items.slice(0, s.index + 1 + n) }))
              setShowSettings(false)
              showToast(`Bu oturum ${n} soru daha sürecek.`)
            }}
          />
        </Suspense>
      )}
      {showEasy && (
        <div className="break-note" role="status">
          <p>
            {afterBreak ? (
              <>
                <strong>{awayFor} gün sonra döndün, hoş geldin.</strong> İstersen önce bildiğin kelimelerden üç kolay soruyla ısınalım. Bunlar ilerlemeni ve tekrar takvimini etkilemez.
              </>
            ) : (
              <>
                <strong>Üst üste zorlandın.</strong> Böyle anlar olur. Bildiğin kelimelerden üç kolay soru ekleyelim mi? Bunlar ilerlemeni ve tekrar takvimini etkilemez; yalnızca ritmi toparlar.
              </>
            )}
          </p>
          <div className="break-actions">
            <button className="btn btn-quiet" onClick={addEasy}>
              {afterBreak ? 'Isınalım' : 'Kolay sorular ekle'}
            </button>
            <button className="link" onClick={() => setEasyDismissed(true)}>
              Gerek yok
            </button>
          </div>
        </div>
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
      {item.learningBatch !== undefined && (
        <p className="small muted" role="status">
          Öğrenme grubu {item.learningBatch + 1}/{Math.max(...session.items.map((it) => it.learningBatch ?? 0)) + 1}
          {(() => {
            // The step on screen, out of the word's steps this session (the plant's ring counts the ones done).
            const steps = stepsOf(item.entryId, session)
            return steps ? ` · Adım ${Math.min(steps.done + 1, steps.total)}/${steps.total}` : ''
          })()}
          {' · '}{item.kind === 'introduce' ? 'Kelimeyi tanı' : item.exerciseType === 'typed_translation' ? 'Yazarak hatırla' : 'Anlamı pekiştir'}
        </p>
      )}
      {item.learningBatch !== undefined && (() => {
        const deferred = (session.pendingLearning ?? []).filter((id) => session.items.some((it) => it.entryId === id && it.learningBatch !== undefined && it.learningBatch < item.learningBatch!))
        return deferred.length > 0 ? <p className="note small">Önceki gruptan {deferred.length} kelime ek pekiştirme için ayrıldı; sonraki turda öncelikli gelecek.</p> : null
      })()}
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
            ? `Verdiğin ${answered + onScreen} cevap kaydedildi. Kalan ${session.items.length - session.index - onScreen} soru ve pekiştirme adımların kaldığın yerden devam etmek üzere kaydedildi.`
            : 'Henüz cevap vermedin; görev olduğu gibi bekleyecek.'}
        </ConfirmDialog>
      )}
      <div className="session-stage">
      {session.index === 0 && session.log.length === 0 && answeredAt === null && session.items.length >= 1 && (
        <p className="session-hello">
          {/* A word card brings its own drawing (the part of speech): one monkey in a box, not two. */}
          {item && !form && item.kind !== 'introduce' && !refreshDue(item, entry) && <img src={ANIMATED_MONKI.wave} alt="" width={44} height={44} draggable={false} />}
          <span>
            Bu turda <strong>{goal.total}</strong> kelime var. Pekiştirme soruları gerektiğinde geri gelecek.
          </span>
        </p>
      )}
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
      ) : refreshDue(item, entry) ? (
        <RefreshCard
          key={`refresh-${session.index}`}
          entry={entry}
          onRemember={() => setRefreshed((r) => new Set(r).add(entry.id))}
          onStruggle={() => {
            setRefreshed((r) => new Set(r).add(entry.id))
            // A word that feels hard comes once more later, as an easy question that doesn't touch the schedule.
            setSession((s) => insertLater(s, { kind: 'exercise', entryId: entry.id, reason: 'practice', skill: 'recognition', exerciseType: 'mc_meaning' }, STRUGGLE_GAP))
          }}
        />
      ) : item.kind === 'introduce' ? (
        <Intro
          key={session.index}
          entry={entry}
          catalog={distractorPool}
          rng={rng}
          teachFirst={item.learningBatch !== undefined}
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
          combo={combo}
          helpFor={() => {
            const state = states.current.get(entry.id) ?? newWordState(entry, new Date())
            const help = leechHelp(state, entry, offeredHelp.current)
            // Three wrong in a row is offered every time; the broader kind once a session, so the word is not nagged on each miss.
            if (help && !needsIntervention(state)) offeredHelp.current.add(entry.id)
            return help
          }}
          onRelearn={() => relearn(entry)}
          wordState={() => states.current.get(entry.id)}
          listenRate={listeningRate(speechPrefs.rate, states.current.get(entry.id)?.skills.listening?.stability)}
          intrusionSources={intrusionSources}
          onEntryUpdated={(updated) => setById((m) => new Map(m).set(updated.id, updated))}
          onToggleDifficult={() => void markDifficult(!isDifficult(entry))}
          onTypePref={p.settings && p.onSettings ? setTypePref : undefined}
          steps={() => stepsOf(entry.id)}
          copyStep={p.mode === 'normal' && prefs.copyAfterMiss && item.probe === undefined && typedAllowed(entry.id)}
        />
      )}
      </div>
    </div>
  )
}

/** The run that multiplies XP at the end of the log: a wrong answer halves it (introductions don't count). Same rule as `computeXp`. */
function comboOf(log: readonly SessionLogEntry[]): number {
  let n = 0
  for (const entry of log) if (entry.verdict !== undefined) n = entry.independent === false ? 0 : nextCombo(n, entry.verdict)
  return n
}

/** Consecutive non-wrong answers at the end of the log (what the chimes for a run of five count). */
function strictRunOf(log: readonly SessionLogEntry[]): number {
  let n = 0
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].verdict === undefined) continue
    if (log[i].verdict === 'wrong' || log[i].independent === false) break
    n++
  }
  return n
}
