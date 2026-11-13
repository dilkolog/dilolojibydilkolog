import type { PlanItem } from './dailyPlan'
import { MASTERY_STAGES, type MasteryStage } from './mastery'
import type { Rng } from './rng'
import { exerciseTypesFor, EXERCISES } from './exercises'
import { blockedByPrefs } from './exercises'
import { pickExerciseType } from './selection'
import type { Confidence, EngineOptions, ErrorType, ExerciseType, ReviewMode, Skill, UserWordState, VocabularyEntry, Verdict } from './types'

export interface SessionLogEntry {
  entryId: string
  item: PlanItem
  verdict?: Verdict
  errorType?: ErrorType
  stageBefore?: MasteryStage
  stageAfter?: MasteryStage
  /** XP earned by this answer. */
  xp?: number
  independent?: boolean
  responseMs?: number
  confidence?: Confidence
}

export interface Session {
  items: PlanItem[]
  index: number
  /** How many times each word has been re-queued this session. */
  retries: Record<string, number>
  /** Correct answers a missed word still needs before it may leave the session. */
  relearn: Record<string, number>
  relearnSkills?: Record<string, Skill>
  /** Graduated follow-ups already given to each word met for the first time this session. */
  followUps?: Record<string, number>
  followUpTargets?: Record<string, number>
  pendingLearning?: string[]
  log: SessionLogEntry[]
}

/** A missed word comes back this many items later — long enough that it isn't just echoed. */
export const RETRY_GAP = 3
/**
 * Successive relearning (Rawson & Dunlosky): a missed word has to be recalled correctly this
 * many times, spaced apart, before the session lets it go. One lucky answer isn't relearning.
 */
export const RELEARN_TARGET = 2
/** Cap on re-queues per word, so a word that won't stick can't take over the session. */
export const MAX_RETRIES = 3
/**
 * Graduated interval recall (Pimsleur 1967; Landauer & Bjork 1978): a word met for the first
 * time comes back after a few items, then after more, while it is still fragile. Expanding gaps
 * beat a fixed one. Counted as practice, so the schedule isn't inflated by same-session repeats.
 */
export const GRADUATED_GAPS = [4, 9]

/** The gap for a new word's next follow-up, or undefined when it's had them (or is being relearned). */
export function graduatedGap(s: Session, entryId: string): number | undefined {
  const isNew = s.log.some((l) => l.entryId === entryId && l.item.kind === 'introduce')
  if (!isNew || (s.relearn[entryId] ?? 0) > 0) return undefined
  const done = s.followUps?.[entryId] ?? 0
  return done < (s.followUpTargets?.[entryId] ?? GRADUATED_GAPS.length) ? GRADUATED_GAPS[done] : undefined
}

/**
 * The 85 % rule (Wilson et al. 2019): learning is fastest when about 85 % of answers are right.
 * From the session's recent answers: above 90 %, the next item of a skill is asked in a harder
 * format (typing instead of choosing); below 75 %, in an easier one. The skill stays the same.
 */
export function adaptExercise(item: PlanItem, entry: VocabularyEntry, state: UserWordState | undefined, recent: readonly (Verdict | undefined)[], rng: Rng, opts: EngineOptions = {}): PlanItem {
  if (item.kind !== 'exercise' || !item.exerciseType || item.reason === 'new' || item.reason === 'practice' || item.learningFollowUp) return item
  const graded = recent.filter((v): v is Verdict => !!v).slice(-8)
  if (graded.length < 5) return item
  const accuracy = graded.filter((v) => v !== 'wrong').length / graded.length
  const want = accuracy > 0.9 ? 'harder' : accuracy < 0.75 ? 'easier' : null
  if (!want) return item
  const isChoice = (t: ExerciseType) => EXERCISES[t].input === 'choice'
  if (want === 'harder' ? !isChoice(item.exerciseType) : isChoice(item.exerciseType)) return item
  const pool = exerciseTypesFor(item.skill, entry, opts, state ?? null).filter((t) => (want === 'harder' ? !isChoice(t) : isChoice(t)))
  if (!pool.length) return item
  const fresh = pool.filter((t) => t !== state?.lastExerciseType)
  return { ...item, exerciseType: (fresh.length ? fresh : pool)[Math.floor(rng() * (fresh.length ? fresh : pool).length)] }
}

/**
 * A long session that has turned into a run of misses: suggest a short break. Easier formats
 * (adaptExercise) help a dip; a lasting drop late in a session is more often tiredness, and
 * practice spread over time is remembered better than more of it in one sitting (distributed
 * practice; Cepeda et al. 2006). Needs at least BREAK_AFTER answers and fewer than half of the
 * last eight right.
 */
export const BREAK_AFTER = 15
export function suggestBreak(log: readonly Pick<SessionLogEntry, 'verdict'>[]): boolean {
  const graded = log.filter((l) => l.verdict)
  if (graded.length < BREAK_AFTER) return false
  const recent = graded.slice(-8)
  return recent.filter((l) => l.verdict !== 'wrong').length < recent.length / 2
}

export type TypingShare = 'low' | 'balanced' | 'high'
/** Share of recognition questions turned into typing for words already met (Settings → Yazma oranı). */
export const TYPING_SHARE: Record<TypingShare, number> = { low: 0, balanced: 0.25, high: 0.5 }

/**
 * Typing in between multiple choice: producing a word (recall) makes it stick better than picking
 * it out of four (generation effect; Slamecka & Graf 1978), so for a word that has been answered at
 * least once, some recognition questions become "type the word for this meaning".
 */
export function mixInTyping(item: PlanItem, state: UserWordState | undefined, share: number, rng: Rng, typedAllowed = true): PlanItem {
  if (item.kind !== 'exercise' || item.reason === 'new' || item.skill !== 'recognition' || share <= 0 || !typedAllowed) return item
  if (!state?.skills.recognition || state.skills.recognition.reps < 1) return item
  if (state.lastExerciseType === 'typed_translation' || rng() >= share) return item
  return { ...item, skill: 'recall', exerciseType: 'typed_translation' }
}

/** Days of recognition stability after which a choice in a sentence is typed instead. */
export const STRONG_RECOGNITION_DAYS = 14

/**
 * Picking the word for a blank out of four only tests recognition; once a word has been recognised
 * reliably for weeks and recalled at least once, the same blank is typed, with its first letter
 * given (productive recall makes it stick; Karpicke & Roediger 2008; Clozemaster's text input).
 */
export function typeStrongCloze(item: PlanItem, state: UserWordState | undefined): PlanItem {
  if (item.kind !== 'exercise' || item.exerciseType !== 'mc_context') return item
  const { recognition, recall } = state?.skills ?? {}
  if (!recognition || recognition.stability < STRONG_RECOGNITION_DAYS || !recall?.reps) return item
  return { ...item, skill: 'production', exerciseType: 'cloze_typed', firstLetter: true }
}

/** The second in-session comeback of a word is typed: recognised twice, now produced. */
export function typedFollowUp(item: PlanItem, typedAllowed = true): PlanItem {
  // Typing from the meaning switched off (or a meaning too long to type from): the follow-up is a plain meaning choice instead.
  if (!typedAllowed) return { ...item, probe: undefined, kind: 'exercise', skill: 'recognition', exerciseType: 'mc_meaning' }
  return { ...item, probe: undefined, kind: 'exercise', skill: 'recall', exerciseType: 'typed_translation' }
}

/**
 * A question planned before its type was switched off (the session's own settings, "Bu tür soru: Hiç"):
 * the plan holds its type from when it was built, so the change must be applied as each one comes up.
 * Another type of the same skill, or a plain meaning choice when that skill has none left.
 */
export function honorOff(item: PlanItem, entry: VocabularyEntry, state: UserWordState | undefined, rng: Rng, opts: EngineOptions = {}): PlanItem {
  if (item.kind !== 'exercise' || !item.exerciseType) return item
  const meta = EXERCISES[item.exerciseType]
  const available = meta.applicable(entry) && (!meta.requiresAI || opts.ai) && (!meta.requiresSpeech || opts.speech)
  if (available && !blockedByPrefs(item.exerciseType, entry, opts)) return item
  try {
    return { ...item, exerciseType: pickExerciseType(item.skill, entry, state, rng, opts) }
  } catch {
    return { ...item, skill: 'recognition', exerciseType: 'mc_meaning', firstLetter: undefined }
  }
}

export const LEARNING_BATCH_SIZE = 3

export function startSession(items: readonly PlanItem[]): Session {
  const ids = [...new Set(items.filter((it) => it.kind === 'introduce').map((it) => it.entryId))]
  const groups = new Map(ids.map((id, i) => [id, Math.floor(i / LEARNING_BATCH_SIZE)]))
  // Reviews first; each new group finishes its guided repetitions before the next one opens.
  const grouped = items.map((it) => groups.has(it.entryId) ? { ...it, learningBatch: groups.get(it.entryId) } : it)
  if (ids.length > LEARNING_BATCH_SIZE) grouped.sort((a, b) => (a.learningBatch ?? -1) - (b.learningBatch ?? -1))
  return { items: grouped, index: 0, retries: {}, relearn: {}, log: [] }
}

export const currentItem = (s: Session): PlanItem | undefined => s.items[s.index]
export const isFinished = (s: Session) => s.index >= s.items.length

/** Same skill, different format: the retry tests the memory, not the screen just seen. */
export function retryItem(
  item: PlanItem,
  entry: VocabularyEntry,
  state: UserWordState,
  rng: Rng,
  opts: EngineOptions = {},
): PlanItem {
  const available = exerciseTypesFor(item.skill, entry, opts, state)
  const base: PlanItem = available.length ? item : { ...item, skill: 'recognition', firstLetter: undefined }
  return { ...base, probe: undefined, kind: 'exercise', exerciseType: available.length ? pickExerciseType(item.skill, entry, state, rng, opts) : 'mc_meaning', reason: 'practice', learningFollowUp: true }
}

/**
 * Moves past the current item. `retry` is the item to re-queue if the word still needs
 * relearning; it is used only when the answer was wrong or the word hasn't yet reached its
 * relearning target.
 */
export function completeItem(s: Session, log: Omit<SessionLogEntry, 'item'>, retry?: PlanItem, followUp?: PlanItem): Session {
  const item = s.items[s.index]
  const id = item.entryId
  const items = [...s.items]
  const relearn = { ...s.relearn }
  const retries = { ...s.retries }
  const relearnSkills = { ...s.relearnSkills }
  if (log.verdict === 'wrong' || log.independent === false) {
    relearn[id] = RELEARN_TARGET
    relearnSkills[id] = item.skill
  } else if (log.verdict && relearn[id] && (!relearnSkills[id] || relearnSkills[id] === item.skill)) relearn[id]--
  const nextBatch = item.learningBatch === undefined ? -1 : items.findIndex((it, i) => i > s.index && it.learningBatch !== undefined && it.learningBatch > item.learningBatch!)
  const insertAt = (gap: number) => Math.min(s.index + 1 + gap, nextBatch < 0 ? items.length : nextBatch)
  const pending = items.slice(s.index + 1).some((it) => it.entryId === id && it.kind === 'exercise')
  if (retry && !pending && relearn[id] > 0 && (retries[id] ?? 0) < MAX_RETRIES) {
    items.splice(insertAt(RETRY_GAP), 0, { ...retry, learningBatch: item.learningBatch })
    retries[id] = (retries[id] ?? 0) + 1
  }
  const followUps = { ...(s.followUps ?? {}) }
  const followUpTargets = { ...(s.followUpTargets ?? {}) }
  const firstAnswer = !s.log.some((l) => l.entryId === id && l.verdict)
  if (firstAnswer && log.independent === true && log.responseMs && log.responseMs < 3000) followUpTargets[id] = 1
  const gap = log.independent !== false && log.verdict && log.verdict !== 'wrong' ? graduatedGap({ ...s, followUpTargets }, id) : undefined
  if (followUp && gap !== undefined && !pending && !(relearn[id] > 0)) {
    items.splice(insertAt(gap), 0, { ...followUp, probe: undefined, reason: 'practice', learningFollowUp: true, learningBatch: item.learningBatch })
    followUps[id] = (followUps[id] ?? 0) + 1
  }
  return { items, index: s.index + 1, retries, relearn, relearnSkills, followUps, followUpTargets, log: [...s.log, { ...log, item }] }
}

/** A first recall test must create its card; repeats must not repeatedly advance FSRS. */
export function attemptMode(item: PlanItem, mode: ReviewMode, state: UserWordState, evidence?: { verdict: Verdict; hintsUsed: number; maxHints: number }): ReviewMode {
  if (mode !== 'normal') return mode
  if (item.reason !== 'practice') return mode
  if (item.learningFollowUp && evidence && (evidence.verdict === 'wrong' || (evidence.maxHints > 0 && evidence.hintsUsed >= evidence.maxHints))) return 'normal'
  const skill = item.exerciseType && EXERCISES[item.exerciseType].skill
  return item.learningFollowUp && skill && !state.skills[skill] ? 'normal' : 'practice'
}

/** Per-word progression: fast independent recognition goes straight to recall; misses keep two recoveries. */
export function advanceLearning(s: Session, log: Omit<SessionLogEntry, 'item'>, entry: VocabularyEntry, state: UserWordState, rng: Rng, opts: EngineOptions = {}): Session {
  const item = currentItem(s)!
  const debt = state.learning?.[item.skill]?.remaining ?? 0
  const before = debt && !s.relearn[entry.id] ? { ...s, relearn: { ...s.relearn, [entry.id]: debt + 1 }, relearnSkills: { ...s.relearnSkills, [entry.id]: item.skill } } : s
  const retry = log.verdict === 'wrong' || log.independent === false || (before.relearn[entry.id] ?? 0) > 0 ? retryItem({ ...item, skill: before.relearnSkills?.[entry.id] ?? item.skill }, entry, state, rng, opts) : undefined
  const typedAllowed = !blockedByPrefs('typed_translation', entry, opts)
  const directRecall = log.independent === true && !!log.responseMs && log.responseMs < 3000 && !s.log.some((l) => l.entryId === entry.id && l.verdict)
  const followUp = (before.followUps?.[entry.id] ?? 0) >= 1 || directRecall
    ? typedFollowUp(item, typedAllowed)
    : { ...item, kind: 'exercise' as const, skill: 'recognition' as const, exerciseType: 'mc_meaning' as const }
  const after = completeItem(before, log, retry, followUp)
  const pending = new Set(after.pendingLearning ?? [])
  if (Object.values(state.learning ?? {}).some((e) => e && e.remaining > 0)) pending.add(entry.id)
  else pending.delete(entry.id)
  return { ...after, pendingLearning: [...pending] }
}

/** Stable word goal: adding a retry cannot move the progress bar backwards. */
export function sessionProgress(s: Session): { completed: number; total: number; percent: number } {
  const all = new Set(s.items.map((it) => it.entryId))
  const pending = new Set(s.items.slice(s.index).map((it) => it.entryId))
  const completed = all.size - pending.size
  return { completed, total: all.size, percent: all.size ? completed / all.size * 100 : 100 }
}

export interface LearningSteps {
  /** The introduction plus every independent right answer so far. */
  done: number
  /** Steps this session asks of the word as things stand (a miss adds retries, a fast first answer drops a reinforcement). */
  total: number
  /** Nothing more is asked this session, but learning debt remains: the word goes on next time (never shown as complete). */
  carriesOver: boolean
}

/**
 * Display only: where a word met for the first time in this session stands in its guided steps
 * (introduction, meaning, reinforcement, typed recall, plus any retries). Successful repetitions
 * deliberately leave the FSRS card alone, so the growth ring alone would sit still during first
 * learning. Read from the session as it is; nothing here changes the plan or what is saved.
 * Undefined for words that are not being guided in this session (reviews keep their usual ring).
 * `debt`: the word's saved state still owes independent recalls (learningDebts).
 */
export function learningSteps(s: Session, entryId: string, debt = false): LearningSteps | undefined {
  const mine = s.log.filter((l) => l.entryId === entryId)
  const ahead = s.items.slice(s.index).filter((it) => it.entryId === entryId)
  if (![...mine.map((l) => l.item), ...ahead].some((it) => it.learningBatch !== undefined)) return undefined
  const done = mine.filter((l) => l.item.kind === 'introduce' || l.independent === true).length
  const queuedTests = ahead.filter((it) => it.kind === 'exercise').length
  const relearn = s.relearn[entryId] ?? 0
  // A relearning word comes back once per right answer it still owes, while re-queues are left.
  const moreRetries = relearn > 0 ? Math.max(0, Math.min(relearn - queuedTests, MAX_RETRIES - (s.retries[entryId] ?? 0))) : 0
  // The graduated follow-ups a new word has not had yet. After a miss they are not added this
  // session (completeItem), so they stand for what the next session still has to cover.
  const isNew = mine.some((l) => l.item.kind === 'introduce') || ahead.some((it) => it.kind === 'introduce')
  const moreFollowUps = isNew ? Math.max(0, (s.followUpTargets?.[entryId] ?? GRADUATED_GAPS.length) - (s.followUps?.[entryId] ?? 0)) : 0
  const total = done + ahead.length + moreRetries + moreFollowUps
  if (ahead.length || moreRetries) return { done, total, carriesOver: false }
  // Nothing more this session: complete only when no debt is left; otherwise one step stays open for next time.
  return relearn > 0 || debt ? { done, total: Math.max(total, done + 1), carriesOver: true } : { done, total: done, carriesOver: false }
}

/** Puts an extra item `gap` places after the current one (at the end when the session is shorter). */
export function insertLater(s: Session, item: PlanItem, gap = RETRY_GAP): Session {
  const items = [...s.items]
  items.splice(Math.min(s.index + 1 + gap, items.length), 0, item)
  return { ...s, items }
}

/** Drops the remaining items for a word (e.g. after "I already know this"). */
export function skipRemaining(s: Session, entryId: string): Session {
  const items = s.items.filter((it, i) => i < s.index || it.entryId !== entryId)
  return { ...s, items }
}

export interface WordResult {
  entryId: string
  correct: number
  wrong: number
  stageBefore?: MasteryStage
  stageAfter?: MasteryStage
}

export interface SessionSummary {
  /** Every word answered in the session, in first-seen order. */
  words: WordResult[]
  answered: number
  correct: number
  /** Words whose mastery stage went up during the session. */
  strengthened: string[]
  /** Words answered wrong at least once. */
  struggling: string[]
  errors: Partial<Record<ErrorType, number>>
  introduced: string[]
  xp: number
  /** Still needs independent recoveries; a finished round is not a learned word. */
  pendingLearning?: string[]
  independentCorrect?: number
}

export function summarize(s: Session): SessionSummary {
  const answers = s.log.filter((l) => l.verdict)
  const first = new Map<string, MasteryStage | undefined>()
  const last = new Map<string, MasteryStage | undefined>()
  for (const l of answers) {
    if (!first.has(l.entryId)) first.set(l.entryId, l.stageBefore)
    last.set(l.entryId, l.stageAfter)
  }
  const rank = (st?: MasteryStage) => (st ? MASTERY_STAGES.indexOf(st) : -1)
  const errors: Partial<Record<ErrorType, number>> = {}
  for (const l of answers) if (l.errorType && l.verdict !== 'correct') errors[l.errorType] = (errors[l.errorType] ?? 0) + 1
  const words = new Map<string, WordResult>()
  for (const l of answers) {
    const w = words.get(l.entryId) ?? { entryId: l.entryId, correct: 0, wrong: 0, stageBefore: l.stageBefore }
    if (l.verdict === 'wrong') w.wrong++
    else w.correct++
    w.stageAfter = l.stageAfter
    words.set(l.entryId, w)
  }
  return {
    ...([...new Set([...(s.pendingLearning ?? []), ...Object.keys(s.relearn).filter((id) => s.relearn[id] > 0)])].length ? { pendingLearning: [...new Set([...(s.pendingLearning ?? []), ...Object.keys(s.relearn).filter((id) => s.relearn[id] > 0)])] } : {}),
    ...(s.log.some((l) => l.independent !== undefined) ? { independentCorrect: s.log.filter((l) => l.independent).length } : {}),
    words: [...words.values()],
    answered: answers.length,
    correct: answers.filter((l) => l.verdict !== 'wrong').length,
    strengthened: [...last.keys()].filter((id) => rank(last.get(id)) > rank(first.get(id))),
    struggling: [...new Set(answers.filter((l) => l.verdict === 'wrong').map((l) => l.entryId))],
    errors,
    introduced: s.log.filter((l) => l.item.kind === 'introduce').map((l) => l.entryId),
    xp: s.log.reduce((sum, l) => sum + (l.xp ?? 0), 0),
  }
}

/** A day estimated above this many minutes is done in two sittings (unless a session cap is set). */
export const SPLIT_ABOVE_MINUTES = 15

/**
 * Where to end the first of two sittings: about halfway, but never between a word's introduction
 * and its first test, so no word is left introduced and untested until later. Practice spread over
 * two sittings is remembered better than the same practice in one (distributed practice;
 * Cepeda et al. 2006), and the second half isn't done tired.
 */
export function firstSittingEnd(items: readonly PlanItem[], requestedEnd = Math.ceil(items.length / 2)): number {
  const half = Math.max(0, requestedEnd)
  for (let end = half; end < items.length; end++) {
    const before = items.slice(0, end)
    const open = before.some((it) => it.kind === 'introduce' && !before.some((x) => x.kind === 'exercise' && x.entryId === it.entryId))
    if (!open) return end
  }
  return items.length
}
