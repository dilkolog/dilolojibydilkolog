import { describe, expect, it } from 'vitest'
import { milestone, weeklyGrowth } from './knownMilestones'
import { analyzeText, readingKey } from '../engine/reading'

describe('known-word count', () => {
  it('sets the next milestone', () => {
    expect(milestone(0)).toEqual({ from: 0, to: 500 })
    expect(milestone(4200)).toEqual({ from: 3000, to: 5000 })
    expect(milestone(5000)).toEqual({ from: 5000, to: 7500 })
    expect(milestone(61_000)).toEqual({ from: 60_000, to: 70_000 })
  })

  it('measures growth against the snapshot a week back', () => {
    const now = new Date(2026, 9, 20, 12)
    const log = [{ day: '2026-10-10', total: 900 }, { day: '2026-10-13', total: 1000 }, { day: '2026-10-19', total: 1100 }]
    expect(weeklyGrowth(log, 1150, now)).toBe(150)
    expect(weeklyGrowth([{ day: '2026-10-19', total: 1100 }], 1150, now)).toBeNull()
  })
})

describe('ignored words while reading', () => {
  it('count like names, outside the coverage', () => {
    const a = analyzeText('The zorbly cat sat.', 'en', [], [], new Set(['cat', 'sat'].map((w) => readingKey(w, 'en'))), new Set([readingKey('zorbly', 'en')]))
    expect(a.counts.unseen).toBe(0)
    expect(a.counts.name).toBe(1)
  })
})
