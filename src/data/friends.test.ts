import { describe, expect, it } from 'vitest'
import { FriendsError, recentDays, showCode } from './friends'

describe('friends client helpers', () => {
  it('formats friend code with a dash in the middle', () => {
    expect(showCode('MHKFMSP6')).toBe('MHKF-MSP6')
    expect(showCode('ABCD')).toBe('ABCD')
    expect(showCode('')).toBe('')
  })

  it('filters recent XP days to the last 14 days and ignores zero XP', () => {
    const today = '2026-10-16'
    const byDay = new Map<string, number>([
      ['2026-10-16', 50],
      ['2026-10-15', 30],
      ['2026-10-03', 20], // exactly 13 days ago (shift -13)
      ['2026-10-02', 40], // 14 days ago: older than window
      ['2026-10-14', 0],  // zero XP: ignored
      ['2026-10-17', 80], // future date: ignored
    ])

    const recent = recentDays(byDay, today)
    expect(recent).toEqual({
      '2026-10-16': 50,
      '2026-10-15': 30,
      '2026-10-03': 20,
    })
  })

  it('creates FriendsError with reason property', () => {
    const err = new FriendsError('unknown')
    expect(err.reason).toBe('unknown')
    expect(err.message).toBe('unknown')
    expect(err instanceof Error).toBe(true)
  })
})
