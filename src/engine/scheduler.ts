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

/** Default FSRS-6 forgetting-curve decay (w20). */
const DEFAULT_DECAY = -generatorParameters().w[20]

/**
 * Review workload at `retention` relative to the 0.9 default: intervals scale with
 * (R^(1/decay) − 1), and the number of reviews with the inverse. 0.95 ≈ 2.5× the reviews, 0.85 ≈ 0.5×.
 */
export function relativeWorkload(retention: number, decay = DEFAULT_DECAY): number {
  const interval = (r: number) => Math.pow(r, 1 / decay) - 1
  return interval(0.9) / interval(retention)
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
