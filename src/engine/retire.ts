import { masteryStage } from './mastery'
import type { UserWordState } from './types'

/**
 * Retirement (WaniKani's "burned"): a word known so well that routine reviews only cost time.
 * It leaves the daily reviews; a couple of surprise checks a day still catch the rare slip, and
 * one wrong answer brings it back. Derived from the state, with a manual override either way.
 */

/** Memory stability (days) every practised skill must reach. */
export const RETIRE_STABILITY_DAYS = 180
/** Retired words still checked per day, at most. */
export const SURPRISE_PER_DAY = 2

export function qualifiesForRetirement(state: UserWordState): boolean {
  const cards = Object.values(state.skills)
  return cards.length > 0 && masteryStage(state) === 'mastered' && cards.every((c) => c.stability >= RETIRE_STABILITY_DAYS)
}

/** `auto`: retire qualifying words without being asked (Settings). */
export function isRetired(state: UserWordState, auto: boolean): boolean {
  if (state.retired !== undefined) return state.retired
  return auto && qualifiesForRetirement(state)
}
