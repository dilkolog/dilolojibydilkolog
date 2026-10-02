import type { Card } from 'ts-fsrs'
import { localDate } from './progress'
import type { UserWordState } from './types'

/**
 * How much studying each day should get (Anki's "easy days" and load balancing, plus a holiday
 * mode). Reviews are moved a little within the window where recall barely changes, towards
 * lighter days and away from rest days and holidays.
 */
export interface Workload {
  /** Share of a normal day's load, Sunday first (Date#getDay): 1 = normal, 0.5 = light, 0 = rest. */
  dayWeights: number[]
  /** Planned holiday (inclusive local dates, YYYY-MM-DD): no reviews scheduled, streak kept. */
  vacation: { from: string; to: string } | null
}

export const NORMAL_WEEK = [1, 1, 1, 1, 1, 1, 1]

const DAY = 86_400_000

export function onVacation(date: Date, w: Workload): boolean {
  const key = localDate(date)
  return !!w.vacation && key >= w.vacation.from && key <= w.vacation.to
}

/** 0 on holidays and rest days, 0.5 on light days, 1 otherwise. */
export function dayWeight(date: Date, w: Workload): number {
  if (onVacation(date, w)) return 0
  return w.dayWeights[date.getDay()] ?? 1
}

/** A day that doesn't count against the streak: a holiday or a chosen rest day. */
export const isRestDay = (date: Date, w: Workload) => dayWeight(date, w) === 0

/** Skill cards due on each local day. */
export function loadByDay(states: readonly UserWordState[]): Map<string, number> {
  const load = new Map<string, number>()
  for (const s of states) for (const c of Object.values(s.skills)) {
    const key = localDate(c.due)
    load.set(key, (load.get(key) ?? 0) + 1)
  }
  return load
}

/** How far a review may move: about where FSRS's own fuzz would put it (wider for long intervals). */
export function balanceWindow(days: number): number {
  if (days < 2) return 0
  if (days < 7) return 1
  if (days < 30) return Math.max(2, Math.round(days * 0.15))
  return Math.max(4, Math.round(days * 0.05))
}

/**
 * Moves a freshly scheduled card to the best day within its window: the lightest relative to
 * that day's weight, never a rest day or holiday if any other day is possible, and as close to
 * the original as ties allow. Updates `load` so a session's reviews spread out too.
 */
export function balanceCard(card: Card, now: Date, load: Map<string, number>, w: Workload): Card {
  const days = card.scheduled_days
  const reach = balanceWindow(days)
  if (!reach) return card
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let best = days
  let bestScore = Infinity
  for (let d = Math.max(1, days - reach); d <= days + reach; d++) {
    const date = new Date(today.getTime() + d * DAY + 12 * 3_600_000)
    const weight = dayWeight(date, w)
    if (weight <= 0) continue
    const score = ((load.get(localDate(date)) ?? 0) + 1) / weight + Math.abs(d - days) * 0.01
    if (score < bestScore) {
      bestScore = score
      best = d
    }
  }
  const due = best === days ? card.due : new Date(card.due.getTime() + (best - days) * DAY)
  load.set(localDate(due), (load.get(localDate(due)) ?? 0) + 1)
  return best === days ? card : { ...card, due, scheduled_days: best }
}
