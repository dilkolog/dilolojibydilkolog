import { createScheduler, type Scheduler } from '../engine/scheduler'
import { KelimeDB } from './db'

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
}

export function configureScheduler(requestRetention: number, weights?: readonly number[] | null) {
  current = createScheduler({ requestRetention, weights: weights ?? undefined })
}
