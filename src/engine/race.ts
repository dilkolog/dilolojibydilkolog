import { localDate } from './progress'

/**
 * Racing your own last week: this week's XP so far against last week's XP up to the same
 * weekday. A fair opponent for a single learner, and a reason to come back each day.
 */

export interface WeeklyRace {
  thisWeek: number
  /** Last week up to and including the same weekday. */
  lastWeekSoFar: number
  lastWeekTotal: number
  /** Weeks in a row (before this one) that beat the week before them. */
  streak: number
}

const DAY = 86_400_000

/** Monday 00:00 (local) of the week containing `d`. */
export function weekStart(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

function sumDays(byDay: ReadonlyMap<string, number>, from: Date, days: number): number {
  let total = 0
  for (let i = 0; i < days; i++) total += byDay.get(localDate(new Date(from.getTime() + i * DAY + 12 * 3600_000))) ?? 0
  return total
}

export function weeklyRace(byDay: ReadonlyMap<string, number>, now: Date): WeeklyRace {
  const start = weekStart(now)
  const elapsed = Math.round((new Date(now).setHours(0, 0, 0, 0) - start.getTime()) / DAY) + 1
  const lastStart = weekStart(new Date(start.getTime() - 3 * DAY))
  let streak = 0
  for (let w = 1; w < 52; w++) {
    const a = weekStart(new Date(start.getTime() - (w * 7 - 3) * DAY))
    const b = weekStart(new Date(a.getTime() - 3 * DAY))
    const ta = sumDays(byDay, a, 7)
    const tb = sumDays(byDay, b, 7)
    if (ta > tb && ta > 0) streak++
    else break
  }
  return {
    thisWeek: sumDays(byDay, start, elapsed),
    lastWeekSoFar: sumDays(byDay, lastStart, elapsed),
    lastWeekTotal: sumDays(byDay, lastStart, 7),
    streak,
  }
}
