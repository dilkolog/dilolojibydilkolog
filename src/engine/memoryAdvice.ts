import { MIN_REVIEWS } from './optimizer'

/** A fit has to lower the held-out loss by at least this much (0.5%) to replace the defaults: less is noise. */
export const MIN_GAIN = 0.005
/** A personal model older than this, and fitted on at most half of today's reviews, is worth refitting. */
export const REFIT_DAYS = 60
const DAY = 86_400_000

export interface MemoryFacts {
  /** Reviews that count for a fit now (see scoredReviews). */
  scored: number
  /** The personal model in use, if any: when it was fitted and on how many reviews. */
  fit: { at: string; reviews: number } | null
  hasWeights: boolean
  /** The last fit that found the defaults good enough (kept on this device only). */
  tried: { reviews: number } | null
  now: Date
}

/**
 * Whether the memory model is worth offering a (re)fit: `fit` once there is enough history and no
 * personal model, `refit` when the history has doubled and the model is two months old. After a fit
 * that found nothing better, it waits until the history has grown by half again.
 */
export function memoryAdvice(f: MemoryFacts): 'fit' | 'refit' | null {
  if (f.scored < MIN_REVIEWS) return null
  if (f.tried && f.scored < f.tried.reviews * 1.5) return null
  if (!f.hasWeights) return 'fit'
  if (!f.fit) return null
  const age = (f.now.getTime() - new Date(f.fit.at).getTime()) / DAY
  return age >= REFIT_DAYS && f.scored >= f.fit.reviews * 2 ? 'refit' : null
}
