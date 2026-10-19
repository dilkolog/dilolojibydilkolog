import { describe, expect, it } from 'vitest'
import { memoryAdvice } from '../memoryAdvice'
import { MIN_REVIEWS } from '../optimizer'

const now = new Date('2026-10-19T12:00:00Z')
const base = { scored: MIN_REVIEWS, fit: null, hasWeights: false, tried: null, now }
const fitted = (daysAgo: number, reviews: number) => ({ hasWeights: true, fit: { at: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(), reviews } })

describe('memoryAdvice', () => {
  it('waits for enough history', () => {
    expect(memoryAdvice({ ...base, scored: MIN_REVIEWS - 1 })).toBeNull()
  })
  it('offers a first fit once there is enough history and no personal model', () => {
    expect(memoryAdvice(base)).toBe('fit')
  })
  it('leaves a model that was fitted recently or on most of the history alone', () => {
    expect(memoryAdvice({ ...base, scored: 2500, ...fitted(10, 1200) })).toBeNull()
    expect(memoryAdvice({ ...base, scored: 1500, ...fitted(90, 1200) })).toBeNull()
  })
  it('offers a refit when the model is old and the history has doubled', () => {
    expect(memoryAdvice({ ...base, scored: 2400, ...fitted(61, 1200) })).toBe('refit')
  })
  it('does not nag after a fit that found the defaults good enough, until the history grows by half', () => {
    const tried = { reviews: 1200 }
    expect(memoryAdvice({ ...base, scored: 1700, tried })).toBeNull()
    expect(memoryAdvice({ ...base, scored: 1800, tried })).toBe('fit')
  })
})
