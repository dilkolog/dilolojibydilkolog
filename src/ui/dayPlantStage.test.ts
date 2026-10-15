import { describe, expect, it } from 'vitest'
import { dayStage } from './dayPlantStage'

describe('dayStage', () => {
  it('returns 5 when done is true, regardless of progress value', () => {
    expect(dayStage(1, true)).toBe(5)
    expect(dayStage(0.5, true)).toBe(5)
    expect(dayStage(0, true)).toBe(5)
  })

  it('returns -1 when progress is 0 or negative and not done (seed stage)', () => {
    expect(dayStage(0, false)).toBe(-1)
    expect(dayStage(-0.1, false)).toBe(-1)
  })

  it('returns stages 0 to 4 for each fifth of the progress', () => {
    // 0.001 to 0.199 -> 0
    expect(dayStage(0.05, false)).toBe(0)
    expect(dayStage(0.19, false)).toBe(0)

    // 0.20 to 0.39 -> 1
    expect(dayStage(0.2, false)).toBe(1)
    expect(dayStage(0.35, false)).toBe(1)

    // 0.40 to 0.59 -> 2
    expect(dayStage(0.4, false)).toBe(2)
    expect(dayStage(0.55, false)).toBe(2)

    // 0.60 to 0.79 -> 3
    expect(dayStage(0.6, false)).toBe(3)
    expect(dayStage(0.75, false)).toBe(3)

    // 0.80 to 0.99 (and capped at 4 before done) -> 4
    expect(dayStage(0.8, false)).toBe(4)
    expect(dayStage(0.99, false)).toBe(4)
    expect(dayStage(1.5, false)).toBe(4)
  })
})
