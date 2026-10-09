import { describe, expect, it } from 'vitest'
import { achievements, badgeSeries, emptyStats } from '../gamification'

describe('badge series', () => {
  it('badges counting the same thing are one badge with steps, smallest first', () => {
    const series = badgeSeries(achievements({ ...emptyStats, wordsIntroduced: 120 }))
    const words = series.find((s) => s.stat === 'wordsIntroduced')!
    expect(words.steps.map((s) => s.goal)).toEqual([1, 50, 100, 250, 500, 1000])
    expect(words.earned).toBe(3)
    expect(words.top!.id).toBe('words-100')
    expect(words.next!.id).toBe('words-250')
    // Every badge is in exactly one series.
    expect(series.flatMap((s) => s.steps).length).toBe(achievements(emptyStats).length)
    expect(series.length).toBeLessThan(achievements(emptyStats).length / 1.5)
  })

  it('a complete series has no next step; an untouched one no top', () => {
    const series = badgeSeries(achievements({ ...emptyStats, perfectDays: 9 }))
    expect(series.find((s) => s.stat === 'perfectDays')).toMatchObject({ earned: 2, next: undefined })
    expect(series.find((s) => s.stat === 'bossesDefeated')).toMatchObject({ earned: 0, top: undefined })
  })
})
