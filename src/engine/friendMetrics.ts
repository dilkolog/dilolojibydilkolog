import { weekStartOf } from './friendLeague'

/**
 * What the friends board measures besides XP, worked out from the XP-by-day each card carries: how many days
 * someone studied (steadiness, which builds a habit more than a big day does), whether a friend shares days
 * only, and a pace-setting rival for a learner with no friends yet.
 */

/** Days with any XP between `from` and `to` (both included). */
export const studiedBetween = (days: Record<string, number>, from: string, to: string) => Object.entries(days).reduce((n, [d, xp]) => (xp > 0 && d >= from && d <= to ? n + 1 : n), 0)

/** Days studied this week so far (Monday to `today`). */
export const weekDays = (days: Record<string, number>, today: string) => studiedBetween(days, weekStartOf(today), today)

/**
 * A card that shares days only has 1 on every day studied (see `presenceDays`): nobody who studied earns exactly 1 XP
 * on every one of their days. Such a card shows "studied" rather than an XP figure.
 */
export function hidesXp(days: Record<string, number>): boolean {
  const studied = Object.values(days).filter((xp) => xp > 0)
  return studied.length > 0 && studied.every((xp) => xp === 1)
}

/** The card as "days only": each day studied is 1, whatever it was. */
export function presenceDays(days: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [d, xp] of Object.entries(days)) if (xp > 0) out[d] = 1
  return out
}

const shift = (day: string, by: number) => new Date(new Date(`${day}T12:00:00Z`).getTime() + by * 86_400_000).toISOString().slice(0, 10)

/** A small stable number in [0, 1) from text, so the same day always gives the same pace. */
function unit(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10_000) / 10_000
}

export interface GhostRival {
  /** XP by day, the last fourteen days, like a friend's card. */
  days: Record<string, number>
  today: number
  week: number
  streak: number
}

/**
 * Monki as a study partner for a learner with no friends: a pace a little above their own (their average over the
 * days they studied, 20 to 120 XP, 40 when there is no history), a rest day now and then, and today's XP growing
 * through the day (from 8:00 to 22:00) so it can be caught. Nothing is stored or sent: the same day gives the same
 * numbers on every device.
 */
export function ghostRival(mine: Record<string, number>, today: string, hour: number): GhostRival {
  const past = Object.entries(mine).filter(([d, xp]) => d < today && xp > 0).map(([, xp]) => xp)
  const average = past.length ? past.reduce((a, b) => a + b, 0) / past.length : 40
  const base = Math.min(120, Math.max(20, average * 1.1))
  const days: Record<string, number> = {}
  for (let back = 13; back >= 0; back--) {
    const day = shift(today, -back)
    if (unit(`rest|${day}`) < 0.14) continue
    const full = Math.round(base * (0.85 + 0.4 * unit(`pace|${day}`)))
    // Today grows through the day: nothing before 8:00, all of it by 22:00.
    days[day] = day === today ? Math.round(full * Math.min(1, Math.max(0, (hour - 8) / 14))) : full
  }
  let streak = 0
  for (let back = days[today] ? 0 : 1; days[shift(today, -back)] && back < 14; back++) streak++
  return { days, today: days[today] ?? 0, week: Object.entries(days).reduce((n, [d, xp]) => (d >= weekStartOf(today) && d <= today ? n + xp : n), 0), streak }
}
