import { describe, expect, it } from 'vitest'
import { monthlyMinutes, recommendedNewWords } from '../workloadForecast'

const OPTIONS = [0, 3, 5, 8, 12, 20]

describe('how many new words a day fit the time', () => {
  it('a month on, twenty a day cost far more than fifteen minutes; five fit', () => {
    expect(monthlyMinutes(20, 0.9)).toBeGreaterThan(30)
    expect(monthlyMinutes(5, 0.9)).toBeLessThan(15)
  })

  it('recommends the largest pace that still fits, more for more time, fewer for higher retention', () => {
    const at15 = recommendedNewWords(OPTIONS, 15, 0.9)
    expect(at15).toBeGreaterThanOrEqual(5)
    expect(at15).toBeLessThan(20)
    expect(recommendedNewWords(OPTIONS, 45, 0.9)).toBeGreaterThan(at15)
    expect(recommendedNewWords(OPTIONS, 15, 0.95)).toBeLessThanOrEqual(at15)
    expect(recommendedNewWords(OPTIONS, 1, 0.9)).toBe(0)
  })
})
