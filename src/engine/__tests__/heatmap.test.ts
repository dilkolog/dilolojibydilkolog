import { describe, expect, it } from 'vitest'
import { heatmap } from '../heatmap'

describe('year calendar', () => {
  it('lays out weeks Monday first, counts per day and finds the longest run', () => {
    const now = new Date(2026, 9, 2, 15) // Friday
    const at = (y: number, m: number, d: number, n = 1) => Array.from({ length: n }, () => new Date(y, m, d, 10))
    const map = heatmap([...at(2026, 9, 2, 5), ...at(2026, 9, 1), ...at(2026, 8, 30), ...at(2026, 8, 20, 40)], now)
    expect(map.weeks).toHaveLength(53)
    expect(map.weeks.every((w) => w.length === 7)).toBe(true)
    expect(new Date(`${map.weeks[0][0].date}T12:00:00`).getDay()).toBe(1)
    const last = map.weeks.at(-1)!
    expect(last[4]).toMatchObject({ date: '2026-10-02', count: 5, future: false })
    expect(last[5].future).toBe(true)
    expect(map.activeDays).toBe(4)
    expect(map.total).toBe(47)
    expect(map.longestStreak).toBe(3)
    expect(map.weeks.flat().find((d) => d.date === '2026-09-20')?.level).toBe(4)
  })
})
