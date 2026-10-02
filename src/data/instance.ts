import { createScheduler, type Scheduler } from '../engine/scheduler'
import { KelimeDB } from './db'
import type { UserWordState } from '../engine/types'
import { loadByDay, type Workload } from '../engine/workload'

/** The app's single database. */
export const db = new KelimeDB()

let current = createScheduler()

/**
 * The app's single scheduler. A stable object that delegates to the current FSRS instance, so
 * changing the target retention in Settings takes effect everywhere without re-wiring.
 */
export const scheduler: Scheduler = {
  newCard: (now) => current.newCard(now),
  review: (card, grade, now) => current.review(card, grade, now),
  retrievability: (card, now) => current.retrievability(card, now),
  plain: () => current.plain?.() ?? current,
}

/** Skill cards due per day, kept current by the app (setLoad) and by every review. */
const load = new Map<string, number>()

export function setLoad(states: readonly UserWordState[]) {
  load.clear()
  for (const [k, v] of loadByDay(states)) load.set(k, v)
}

export function configureScheduler(requestRetention: number, weights?: readonly number[] | null, workload?: Workload) {
  current = createScheduler({
    requestRetention,
    weights: weights ?? undefined,
    // Balancing replaces random fuzz: it spreads reviews on purpose.
    fuzz: !workload,
    balance: workload ? { load, workload } : undefined,
  })
}
