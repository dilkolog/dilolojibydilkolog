import { describe, expect, it } from 'vitest'
import { FRIEND_DAYS, lastDays } from '../friendDays'

describe('lastDays', () => {
  it('lists the last fourteen dates oldest first, zero where the card has none', () => {
    const out = lastDays({ '2026-10-15': 40, '2026-10-12': 60, '2026-09-01': 999 }, '2026-10-15')
    expect(out).toHaveLength(FRIEND_DAYS)
    expect(out.at(-1)).toEqual({ day: '2026-10-15', xp: 40 })
    expect(out[0].day).toBe('2026-10-02')
    expect(out.find((d) => d.day === '2026-10-12')?.xp).toBe(60)
    expect(out.some((d) => d.xp === 999)).toBe(false)
  })
})
