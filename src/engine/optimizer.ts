import { CLAMP_PARAMETERS, createEmptyCard, default_w, fsrs, generatorParameters, W17_W18_Ceiling, type Grade } from 'ts-fsrs'
import type { ReviewEvent } from './types'

/**
 * Personalising FSRS: the default weights are fitted to millions of other learners. With enough
 * of one learner's own history, refitting them predicts that learner's forgetting better, so
 * reviews come when this person is about to forget, not when the average person would.
 *
 * Method: replay every card's reviews with candidate weights, score the predicted recall
 * probability against what actually happened (log loss), and improve the weights by coordinate
 * descent within FSRS's own parameter bounds. New weights are adopted only if they also predict
 * a held-out part of the history better than the defaults.
 */

export interface Review {
  at: number
  rating: Grade
}

/** One FSRS card's answers, oldest first. */
export type History = Review[]

/** Reviews this far apart (in days) are scored; same-day steps say little about long-term memory. */
const MIN_GAP_DAYS = 0.5
const DAY = 86_400_000
/** Fewer scored reviews than this and the fit would chase noise. */
export const MIN_REVIEWS = 1000

export function historiesFrom(events: readonly ReviewEvent[]): History[] {
  const byCard = new Map<string, Review[]>()
  for (const e of events) {
    if (e.mode !== 'normal') continue
    const key = `${e.entryId}|${e.skill}`
    byCard.set(key, [...(byCard.get(key) ?? []), { at: e.timestamp.getTime(), rating: e.rating }])
  }
  return [...byCard.values()].map((h) => h.sort((a, b) => a.at - b.at)).filter((h) => h.length >= 2)
}

/** Reviews that count towards the fit: a prediction exists and enough time has passed. */
export function scoredReviews(histories: readonly History[]): number {
  let n = 0
  for (const h of histories) for (let i = 1; i < h.length; i++) if ((h[i].at - h[i - 1].at) / DAY >= MIN_GAP_DAYS) n++
  return n
}

/** Mean log loss of FSRS's recall predictions under weights `w`. Lower is better. */
export function logLoss(w: readonly number[], histories: readonly History[]): number {
  const f = fsrs(generatorParameters({ w: [...w], enable_fuzz: false }))
  let loss = 0
  let n = 0
  for (const h of histories) {
    let card = createEmptyCard(new Date(h[0].at))
    for (let i = 0; i < h.length; i++) {
      const at = new Date(h[i].at)
      if (i > 0 && (h[i].at - h[i - 1].at) / DAY >= MIN_GAP_DAYS) {
        const r = Math.min(1 - 1e-4, Math.max(1e-4, f.get_retrievability(card, at, false)))
        const recalled = h[i].rating > 1
        loss -= recalled ? Math.log(r) : Math.log(1 - r)
        n++
      }
      card = f.next(card, at, h[i].rating).card
    }
  }
  return n ? loss / n : 0
}

export interface FitResult {
  weights: number[]
  /** Held-out log loss with the default and with the fitted weights. */
  defaultLoss: number
  fittedLoss: number
  /** Relative improvement on held-out data, 0.05 = 5% lower loss. */
  improvement: number
  reviews: number
}

/** Deterministic split, so the same history always gives the same result. */
function split(histories: readonly History[]): { train: History[]; test: History[] } {
  const train: History[] = []
  const test: History[] = []
  histories.forEach((h, i) => (i % 5 === 0 ? test : train).push(h))
  return { train, test: test.length ? test : train }
}

export function fitWeights(
  histories: readonly History[],
  { rounds = 5, onProgress }: { rounds?: number; onProgress?: (done: number) => void } = {},
): FitResult {
  const bounds = CLAMP_PARAMETERS(W17_W18_Ceiling)
  const { train, test } = split(histories)
  let w = [...default_w]
  let best = logLoss(w, train)
  // Positive-only weights move in log space (×/÷ a factor), the rest by a share of their range.
  // Each round halves the step; within a round a direction that helps is followed while it helps.
  let step = 0.7
  const move = (j: number, dir: number) => {
    const [lo, hi] = bounds[j]
    const next = lo > 0 ? w[j] * Math.exp(dir * step) : w[j] + dir * step * 0.15 * (hi - lo)
    return Math.min(hi, Math.max(lo, next))
  }
  for (let round = 0; round < rounds; round++) {
    for (let j = 0; j < w.length; j++) {
      for (const dir of [1, -1]) {
        let improved = false
        for (let k = 0; k < 6; k++) {
          const value = move(j, dir)
          if (value === w[j]) break
          const candidate = [...w]
          candidate[j] = value
          const loss = logLoss(candidate, train)
          if (loss >= best) break
          best = loss
          w = candidate
          improved = true
        }
        if (improved) break
      }
    }
    step /= 2
    onProgress?.((round + 1) / rounds)
  }
  const defaultLoss = logLoss(default_w, test)
  const fittedLoss = logLoss(w, test)
  return { weights: w, defaultLoss, fittedLoss, improvement: defaultLoss > 0 ? (defaultLoss - fittedLoss) / defaultLoss : 0, reviews: scoredReviews(histories) }
}
