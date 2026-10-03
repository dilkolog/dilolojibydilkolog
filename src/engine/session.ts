import type { PlanItem } from './dailyPlan'
import { MASTERY_STAGES, type MasteryStage } from './mastery'
import type { Rng } from './rng'
import { exerciseTypesFor, EXERCISES } from './exercises'
import { pickExerciseType } from './selection'
import type { EngineOptions, ErrorType, ExerciseType, UserWordState, VocabularyEntry, Verdict } from './types'

export interface SessionLogEntry {
  entryId: string
  item: PlanItem
  verdict?: Verdict
  errorType?: ErrorType
  stageBefore?: MasteryStage
  stageAfter?: MasteryStage
  /** XP earned by this answer. */
  xp?: number
}

export interface Session {
  items: PlanItem[]
  index: number
  /** How many times each word has been re-queued this session. */
  retries: Record<string, number>
  /** Correct answers a missed word still needs before it may leave the session. */
  relearn: Record<string, number>
  /** Graduated follow-ups already given to each word met for the first time this session. */
  followUps?: Record<string, number>
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
  return GRADUATED_GAPS[s.followUps?.[entryId] ?? 0]
}

/**
 * The 85 % rule (Wilson et al. 2019): learning is fastest when about 85 % of answers are right.
 * From the session's recent answers: above 90 %, the next item of a skill is asked in a harder
 * format (typing instead of choosing); below 75 %, in an easier one. The skill stays the same.
 */
export function adaptExercise(item: PlanItem, entry: VocabularyEntry, state: UserWordState | undefined, recent: readonly (Verdict | undefined)[], rng: Rng, opts: EngineOptions = {}): PlanItem {
  if (item.kind !== 'exercise' || !item.exerciseType) return item
  const graded = recent.filter((v): v is Verdict => !!v).slice(-8)
  if (graded.length < 5) return item
  const accuracy = graded.filter((v) => v !== 'wrong').length / graded.length
  const want = accuracy > 0.9 ? 'harder' : accuracy < 0.75 ? 'easier' : null
  if (!want) return item
  const isChoice = (t: ExerciseType) => EXERCISES[t].input === 'choice'
  if (want === 'harder' ? !isChoice(item.exerciseType) : isChoice(item.exerciseType)) return item
  const pool = exerciseTypesFor(item.skill, entry, opts).filter((t) => (want === 'harder' ? !isChoice(t) : isChoice(t)))
  if (!pool.length) return item
  const fresh = pool.filter((t) => t !== state?.lastExerciseType)
  return { ...item, exerciseType: (fresh.length ? fresh : pool)[Math.floor(rng() * (fresh.length ? fresh : pool).length)] }
}

export type TypingShare = 'low' | 'balanced' | 'high'
/** Share of recognition questions turned into typing for words already met (Settings → Yazma oranı). */
export const TYPING_SHARE: Record<TypingShare, number> = { low: 0, balanced: 0.25, high: 0.5 }

/**
 * Typing in between multiple choice: producing a word (recall) makes it stick better than picking
 * it out of four (generation effect; Slamecka & Graf 1978), so for a word that has been answered at
 * least once, some recognition questions become "type the word for this meaning".
 */
export function mixInTyping(item: PlanItem, state: UserWordState | undefined, share: number, rng: Rng): PlanItem {
  if (item.kind !== 'exercise' || item.skill !== 'recognition' || share <= 0) return item
  if (!state?.skills.recognition || state.skills.recognition.reps < 1) return item
  if (state.lastExerciseType === 'typed_translation' || rng() >= share) return item
  return { ...item, skill: 'recall', exerciseType: 'typed_translation' }
}

/** The second in-session comeback of a word is typed: recognised twice, now produced. */
export function typedFollowUp(item: PlanItem): PlanItem {
  return { ...item, kind: 'exercise', skill: 'recall', exerciseType: 'typed_translation' }
}

export function startSession(items: readonly PlanItem[]): Session {
  return { items: [...items], index: 0, retries: {}, relearn: {}, log: [] }
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
  return { ...item, kind: 'exercise', exerciseType: pickExerciseType(item.skill, entry, state, rng, opts) }
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
  if (log.verdict === 'wrong') relearn[id] = RELEARN_TARGET
  else if (log.verdict && relearn[id]) relearn[id]--
  if (retry && relearn[id] > 0 && (retries[id] ?? 0) < MAX_RETRIES) {
    items.splice(Math.min(s.index + 1 + RETRY_GAP, items.length), 0, retry)
    retries[id] = (retries[id] ?? 0) + 1
  }
  const followUps = { ...(s.followUps ?? {}) }
  const gap = log.verdict && log.verdict !== 'wrong' ? graduatedGap(s, id) : undefined
  if (followUp && gap !== undefined) {
    items.splice(Math.min(s.index + 1 + gap, items.length), 0, { ...followUp, reason: 'practice' })
    followUps[id] = (followUps[id] ?? 0) + 1
  }
  return { items, index: s.index + 1, retries, relearn, followUps, log: [...s.log, { ...log, item }] }
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
