import { describe, expect, it } from 'vitest'
import { CULL_GROUPS, cullIds, RARE_RANK } from '../cullGroups'
import { newWordState } from '../review'
import type { UserWordState, VocabularyEntry } from '../types'
import { decision, decide, effect } from './fixtures'

const NOW = new Date('2026-10-20T12:00:00Z')
const OLD = new Date('2026-10-01T12:00:00Z')

const entry = (base: VocabularyEntry, id: string, extra: Partial<VocabularyEntry> = {}): VocabularyEntry => ({ ...base, id, lemma: id, addedAt: OLD, source: 'user', frequencyRank: 500, ...extra })
const stateOf = (e: VocabularyEntry, stats: Partial<UserWordState['stats']>): UserWordState => {
  const s = newWordState(e, OLD)
  return { ...s, stats: { ...s.stats, ...stats } }
}

describe('cullIds', () => {
  const struggling = entry(decision, 'a')
  const fine = entry(decide, 'b')
  const untouched = entry(effect, 'c')
  const fresh = entry(effect, 'd', { addedAt: new Date('2026-10-19T12:00:00Z') })
  const rare = entry(decision, 'e', { frequencyRank: RARE_RANK + 1 })
  const unlisted = entry(decision, 'f', { frequencyRank: -1 })
  const unknownRank = entry(decision, 'g', { frequencyRank: 0 })
  const sample = entry(decision, 'h', { source: 'sample' })
  const all = [struggling, fine, untouched, fresh, rare, unlisted, unknownRank, sample]
  const states = new Map<string, UserWordState>([
    ['a', stateOf(struggling, { reviews: 4, wrong: 3, correct: 1 })],
    ['b', stateOf(fine, { reviews: 6, wrong: 1, correct: 5 })],
    ['e', stateOf(rare, { reviews: 2, correct: 2 })],
    ['f', stateOf(unlisted, { reviews: 2, correct: 2 })],
    ['g', stateOf(unknownRank, { reviews: 2, correct: 2 })],
    ['h', stateOf(sample, { reviews: 2, correct: 2 })],
  ])
  const ids = cullIds(all, states, NOW)

  it('finds the words that are always wrong, not the ones that are mostly right', () => {
    expect(ids.struggling).toEqual(['a'])
  })

  it('finds the words on the list for a week or more that were never asked (a new one is given time)', () => {
    expect(ids.untouched).toEqual(['c'])
  })

  it('finds the very rare words (past the 20 000 most frequent, or not listed), not ones whose rank is simply not filled in', () => {
    expect(ids.rare).toEqual(['e', 'f'])
  })

  it('finds the bundled sample words', () => {
    expect(ids.samples).toEqual(['h'])
  })

  it('has a group for each id, with a label and a hint', () => {
    expect(CULL_GROUPS.map((g) => g.id).sort()).toEqual(['rare', 'samples', 'struggling', 'untouched'])
    for (const g of CULL_GROUPS) {
      expect(g.label.trim()).not.toBe('')
      expect(g.hint.trim()).not.toBe('')
    }
  })
})
