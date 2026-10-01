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
  /** Words already re-queued once this session, so a hard word can't loop forever. */
  retried: string[]
  log: SessionLogEntry[]
}

/** A missed word comes back this many items later — long enough that it isn't just echoed. */
export const RETRY_GAP = 3

export function startSession(items: readonly PlanItem[]): Session {
  return { items: [...items], index: 0, retried: [], log: [] }
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

export function completeItem(s: Session, log: Omit<SessionLogEntry, 'item'>, retry?: PlanItem): Session {
  const item = s.items[s.index]
  const items = [...s.items]
  const retried = [...s.retried]
  if (retry && log.verdict === 'wrong' && !retried.includes(item.entryId)) {
    items.splice(Math.min(s.index + 1 + RETRY_GAP, items.length), 0, retry)
    retried.push(item.entryId)
  }
  return { items, index: s.index + 1, retried, log: [...s.log, { ...log, item }] }
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
