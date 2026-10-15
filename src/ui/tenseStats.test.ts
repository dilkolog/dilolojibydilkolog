import { describe, expect, it } from 'vitest'
import type { TenseStat } from '../engine/tenses'
import { MIN_ANSWERS, weakestTense } from './tenseStats'

describe('tenseStats logic', () => {
  it('exposes balance constants', () => {
    expect(MIN_ANSWERS).toBe(3)
  })

  it('returns undefined if no tenses have reached MIN_ANSWERS', () => {
    const stats: TenseStat[] = [
      { tense: 'imparfait', correct: 1, wrong: 1 }, // 2 answers < 3
      { tense: 'futur', correct: 2, wrong: 0 },
    ]
    expect(weakestTense(stats)).toBeUndefined()
  })

  it('returns undefined if all qualified tenses are >= 80% accurate', () => {
    const stats: TenseStat[] = [
      { tense: 'imparfait', correct: 8, wrong: 2 }, // 80%
      { tense: 'present', correct: 10, wrong: 1 }, // ~91%
    ]
    expect(weakestTense(stats)).toBeUndefined()
  })

  it('finds the weakest tense under 80% accuracy', () => {
    const stats: TenseStat[] = [
      { tense: 'present', correct: 9, wrong: 1 }, // 90%
      { tense: 'imparfait', correct: 3, wrong: 3 }, // 50%
      { tense: 'subjonctif', correct: 1, wrong: 4 }, // 20%
    ]
    const weakest = weakestTense(stats)
    expect(weakest).toBeDefined()
    expect(weakest?.tense).toBe('subjonctif')
  })
})
