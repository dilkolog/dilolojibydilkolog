import type { CefrLevel } from './types'
import { CEFR_LEVELS, type LevelCoverage } from './cefrLevels'

export interface CefrGoal {
  level: CefrLevel
  targetDate: string // YYYY-MM-DD
  createdAt: string
}

export interface GoalProgress {
  level: CefrLevel
  targetDate: string
  daysTotal: number
  daysRemaining: number
  wordsRequired: number
  wordsKnown: number
  wordsRemaining: number
  percent: number
  /** New words a day the goal needs, uncapped. */
  neededDailyNew: number
  /** What to suggest as the daily quota: the need, capped at the highest quota the settings offer. */
  suggestedDailyNew: number
  /** The goal needs more new words a day than the settings allow: the date is too close. */
  unrealistic: boolean
  /** The need is more than the daily minutes hold a month on (reviews would pile up): see `sustainableDailyNew`. */
  overMinutes: boolean
  /** When the goal is reached at the current daily quota (YYYY-MM-DD), or null with no new words a day. */
  etaAtCurrent: string | null
  isCompleted: boolean
  isOverdue: boolean
  pace: 'ahead' | 'on_track' | 'behind'
}

/** Standard threshold required in CEFR levels up to the target level (85%). */
export const CEFR_TARGET_THRESHOLD = 0.85

/** The highest daily new-word quota the study settings offer. */
export const MAX_DAILY_NEW = 20

/**
 * Calculates remaining words, days, suggested daily new words and pace towards a CEFR level goal.
 */
export function calculateGoalProgress(
  goal: CefrGoal,
  coverage: readonly LevelCoverage[],
  currentDailyNew: number,
  now = new Date(),
  /** The most new words a day the daily minutes hold (recommendedNewWords); the suggestion stays within it. */
  sustainableDailyNew?: number,
): GoalProgress {
  const targetIdx = CEFR_LEVELS.indexOf(goal.level)
  const targetLevels = new Set(CEFR_LEVELS.slice(0, targetIdx + 1))

  // Sum words across all levels up to the target
  let wordsRequired = 0
  let wordsKnown = 0
  for (const row of coverage) {
    if (targetLevels.has(row.level)) {
      const required = Math.ceil(row.total * CEFR_TARGET_THRESHOLD)
      wordsRequired += required
      wordsKnown += Math.min(row.known, required)
    }
  }

  const wordsRemaining = Math.max(0, wordsRequired - wordsKnown)
  const percent = wordsRequired > 0 ? Math.min(100, Math.round((wordsKnown / wordsRequired) * 100)) : 100
  const isCompleted = wordsRemaining === 0

  const targetTime = new Date(`${goal.targetDate}T23:59:59`).getTime()
  const createdTime = new Date(`${goal.createdAt.slice(0, 10)}T00:00:00`).getTime()
  const currentTime = now.getTime()

  const msPerDay = 86_400_000
  const daysTotal = Math.max(1, Math.round((targetTime - createdTime) / msPerDay))
  const daysRemaining = Math.max(0, Math.ceil((targetTime - currentTime) / msPerDay))
  const isOverdue = daysRemaining === 0 && !isCompleted

  // Suggested daily new words to reach the goal in remaining days
  const effectiveDays = Math.max(1, daysRemaining)
  const neededDailyNew = isCompleted ? 0 : Math.ceil(wordsRemaining / effectiveDays)
  const unrealistic = neededDailyNew > MAX_DAILY_NEW
  const overMinutes = sustainableDailyNew !== undefined && neededDailyNew > sustainableDailyNew
  // Never suggest a quota the daily minutes can't carry: that is the Settings warning ("bu hızla süren yetmez").
  const suggestedDailyNew = Math.min(neededDailyNew, MAX_DAILY_NEW, sustainableDailyNew ?? MAX_DAILY_NEW)
  const etaAtCurrent = isCompleted ? null : currentDailyNew > 0 ? isoDay(new Date(currentTime + Math.ceil(wordsRemaining / currentDailyNew) * msPerDay)) : null

  // Determine pace based on learner's current daily new words setting vs needed
  let pace: 'ahead' | 'on_track' | 'behind' = 'on_track'
  if (isCompleted) {
    pace = 'ahead'
  } else if (isOverdue || currentDailyNew < neededDailyNew) {
    pace = 'behind'
  } else if (currentDailyNew >= neededDailyNew * 1.3) {
    pace = 'ahead'
  }

  return {
    level: goal.level,
    targetDate: goal.targetDate,
    daysTotal,
    daysRemaining,
    wordsRequired,
    wordsKnown,
    wordsRemaining,
    percent,
    neededDailyNew,
    suggestedDailyNew,
    unrealistic,
    overMinutes,
    etaAtCurrent,
    isCompleted,
    isOverdue,
    pace,
  }
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
