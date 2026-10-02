import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from 'ts-fsrs'
import { localDate } from './progress'
import { balanceCard, type Workload } from './workload'

/**
 * Thin wrapper around FSRS. Kept separate so the algorithm can be swapped or re-parameterised
 * (e.g. optimised from review_events) without touching the rest of the engine.
 */
export interface SchedulerOptions {
  /** Target probability of recall at review time. 0.9 is the FSRS default. */
  requestRetention?: number
  /** Randomise intervals slightly so words learned together don't stay clustered. Off in tests. */
  fuzz?: boolean
  /** Personal FSRS weights fitted from the learner's history (see optimizer.ts). */
  weights?: readonly number[]
  /** Spread reviews over days by load, easy days and holidays (see workload.ts). */
  balance?: { load: Map<string, number>; workload: Workload }
}

export interface Scheduler {
  newCard(now: Date): Card
  review(card: Card, grade: Grade, now: Date): Card
  retrievability(card: Card, now: Date): number
  /** The same scheduler without load balancing, for what-if projections that mustn't count as load. */
  plain?(): Scheduler
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
      ...(options.weights ? { w: [...options.weights] } : {}),
    }),
  )
  let plain: Scheduler | undefined
  const self: Scheduler = {
    plain: () => (options.balance ? (plain ??= createScheduler({ ...options, balance: undefined })) : self),
    newCard: (now) => createEmptyCard(now),
    review: (card, grade, now) => {
      const next = f.next(card, now, grade).card
      const b = options.balance
      if (!b) return next
      if (card.reps > 0) {
        const old = localDate(card.due)
        b.load.set(old, Math.max(0, (b.load.get(old) ?? 1) - 1))
      }
      return balanceCard(next, now, b.load, b.workload)
    },
    retrievability: (card, now) => (card.reps === 0 ? 0 : f.get_retrievability(card, now, false)),
  }
  return self
}
