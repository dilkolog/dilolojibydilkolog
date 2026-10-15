import { describe, expect, it } from 'vitest'
import { flameTier } from './flameTier'

describe('flameTier', () => {
  it('returns 0 for streaks under 3 days', () => {
    expect(flameTier(0)).toBe(0)
    expect(flameTier(1)).toBe(0)
    expect(flameTier(2)).toBe(0)
  })

  it('returns 1 for streaks of 3 to 6 days', () => {
    expect(flameTier(3)).toBe(1)
    expect(flameTier(5)).toBe(1)
    expect(flameTier(6)).toBe(1)
  })

  it('returns 2 for streaks of 7 to 29 days', () => {
    expect(flameTier(7)).toBe(2)
    expect(flameTier(14)).toBe(2)
    expect(flameTier(29)).toBe(2)
  })

  it('returns 3 for streaks of 30 to 99 days', () => {
    expect(flameTier(30)).toBe(3)
    expect(flameTier(50)).toBe(3)
    expect(flameTier(99)).toBe(3)
  })

  it('returns 4 for streaks of 100 days or more', () => {
    expect(flameTier(100)).toBe(4)
    expect(flameTier(365)).toBe(4)
  })
})
