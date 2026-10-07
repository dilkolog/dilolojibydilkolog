import type { CefrLevel } from './types'

/**
 * A word's approximate level from how frequent it is: the rank up to which learners at a level
 * usually know the words (a rough reading of vocabulary-size studies per CEFR level, e.g. Milton
 * & Alexiou 2009, which put B1 near 2 500–3 000 words). A hint of how common the word is, not a test.
 */
const BANDS: readonly [CefrLevel, number][] = [
  ['A1', 800],
  ['A2', 1600],
  ['B1', 2800],
  ['B2', 4000],
  ['C1', 6000],
]

export function levelFromRank(rank: number | undefined): CefrLevel | undefined {
  if (!rank || rank < 1) return undefined
  return BANDS.find(([, max]) => rank <= max)?.[0] ?? 'C2'
}
