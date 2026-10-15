import { streakWithFreezes } from './insights'
import { localDate } from './progress'

/**
 * Winning a lost streak back: when a day or two were missed (no freeze left to cover them), the
 * learner may pass the recall exam to mend them. Mended days neither count nor break the streak,
 * like rest days. Earned, not given: the exam has to go well, there is one try per break, and a
 * streak can be mended at most once in REPAIR_EVERY_DAYS.
 */

/** The exam's share of right answers that mends the streak. */
export const REPAIR_MIN_SCORE = 0.7
/** A streak shorter than this is not worth an exam: it is quicker to start again. */
export const REPAIR_MIN_STREAK = 3
/** Days to wait after one mend before the next. */
export const REPAIR_EVERY_DAYS = 14
/** How far back a missed day can still be mended: yesterday and the day before. */
const WINDOW_DAYS = 2

const DAY = 86_400_000
const daysAgo = (now: Date, n: number) => localDate(new Date(now.getTime() - n * DAY))

export interface RepairOffer {
  /** The streak it would be once mended. */
  lost: number
  /** The missed days the exam would mend. */
  days: string[]
}

/**
 * The repair on offer now, if any: missed days in the last two that broke a run of at least
 * REPAIR_MIN_STREAK, when no mend was made in the last REPAIR_EVERY_DAYS days.
 */
export function repairOffer(studyDays: readonly string[], now: Date, isRest: (day: string) => boolean, repaired: readonly string[] = []): RepairOffer | null {
  const mended = new Set(repaired)
  const last = [...mended].sort().at(-1)
  if (last && last >= daysAgo(now, REPAIR_EVERY_DAYS)) return null
  const studied = new Set(studyDays)
  const rest = (d: string) => isRest(d) || mended.has(d)
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => daysAgo(now, i + 1)).filter((d) => !studied.has(d) && !rest(d))
  if (!days.length) return null
  const now_ = streakWithFreezes(studyDays, now, rest)
  // A missed day a freeze already covered broke nothing.
  const broken = days.filter((d) => !now_.frozenDays.includes(d))
  if (!broken.length) return null
  const lost = streakWithFreezes(studyDays, now, (d) => rest(d) || broken.includes(d)).streak
  if (lost < REPAIR_MIN_STREAK || lost <= now_.streak) return null
  return { lost, days: broken.sort() }
}

/** The key of one break: each break gets one try at the exam. */
export const repairKey = (offer: RepairOffer) => offer.days.join(',')
