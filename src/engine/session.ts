import type { PlanItem } from './dailyPlan'
import { MASTERY_STAGES, type MasteryStage } from './mastery'
import type { Rng } from './rng'
import { pickExerciseType } from './selection'
import type { EngineOptions, ErrorType, UserWordState, VocabularyEntry, Verdict } from './types'

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
export function completeItem(s: Session, log: Omit<SessionLogEntry, 'item'>, retry?: PlanItem): Session {
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
  return { items, index: s.index + 1, retries, relearn, log: [...s.log, { ...log, item }] }
}

/** Drops the remaining items for a word (e.g. after "I already know this"). */
export function skipRemaining(s: Session, entryId: string): Session {
  const items = s.items.filter((it, i) => i < s.index || it.entryId !== entryId)
  return { ...s, items }
}

export interface SessionSummary {
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
  return {
    answered: answers.length,
    correct: answers.filter((l) => l.verdict !== 'wrong').length,
    strengthened: [...last.keys()].filter((id) => rank(last.get(id)) > rank(first.get(id))),
    struggling: [...new Set(answers.filter((l) => l.verdict === 'wrong').map((l) => l.entryId))],
    errors,
    introduced: s.log.filter((l) => l.item.kind === 'introduce').map((l) => l.entryId),
    xp: s.log.reduce((sum, l) => sum + (l.xp ?? 0), 0),
  }
}
