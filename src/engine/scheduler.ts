import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from 'ts-fsrs'

/**
 * Thin wrapper around FSRS. Kept separate so the algorithm can be swapped or re-parameterised
 * (e.g. optimised from review_events) without touching the rest of the engine.
 */
export interface SchedulerOptions {
  /** Target probability of recall at review time. 0.9 is the FSRS default. */
  requestRetention?: number
  /** Randomise intervals slightly so words learned together don't stay clustered. Off in tests. */
  fuzz?: boolean
}

export interface Scheduler {
  newCard(now: Date): Card
  review(card: Card, grade: Grade, now: Date): Card
  retrievability(card: Card, now: Date): number
}

export function createScheduler(options: SchedulerOptions = {}): Scheduler {
  const f = fsrs(
    generatorParameters({
      request_retention: options.requestRetention ?? 0.9,
      enable_fuzz: options.fuzz ?? true,
    }),
  )
  return {
    newCard: (now) => createEmptyCard(now),
    review: (card, grade, now) => f.next(card, now, grade).card,
    retrievability: (card, now) => (card.reps === 0 ? 0 : f.get_retrievability(card, now, false)),
  }
}
