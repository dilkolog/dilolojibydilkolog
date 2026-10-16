import { describe, expect, it } from 'vitest'
import { FriendsError, recentDays, showCode } from '../friends'

describe('friends', () => {
  describe('showCode', () => {
    it('formats an 8-character code with a hyphen in the middle', () => {
      expect(showCode('ABCDEFGH')).toBe('ABCD-EFGH')
      expect(showCode('12345678')).toBe('1234-5678')
    })

    it('leaves codes that are not 8 characters unchanged', () => {
      expect(showCode('ABC')).toBe('ABC')
      expect(showCode('ABCDEFGHIJ')).toBe('ABCDEFGHIJ')
      expect(showCode('')).toBe('')
    })
  })

  describe('recentDays', () => {
    it('filters out days older than 13 days before today', () => {
      const byDay = new Map<string, number>([
        ['2026-10-01', 50],
        ['2026-10-02', 40],
        ['2026-10-03', 30],
        ['2026-10-15', 60],
        ['2026-10-16', 70],
      ])
      // Today is 2026-10-16. 13 days back is 2026-10-03.
      // So 2026-10-01 and 2026-10-02 should be excluded.
      const res = recentDays(byDay, '2026-10-16')
      expect(res).toEqual({
        '2026-10-03': 30,
        '2026-10-15': 60,
        '2026-10-16': 70,
      })
    })

    it('filters out future days and non-positive XP', () => {
      const byDay = new Map<string, number>([
        ['2026-10-14', 0],
        ['2026-10-15', -10],
        ['2026-10-16', 25],
        ['2026-10-17', 50], // future
      ])
      const res = recentDays(byDay, '2026-10-16')
      expect(res).toEqual({
        '2026-10-16': 25,
      })
    })
  })

  describe('FriendsError', () => {
    it('stores the reason and inherits from Error', () => {
      const err = new FriendsError('kod_bulunamadi')
      expect(err).toBeInstanceOf(Error)
      expect(err.reason).toBe('kod_bulunamadi')
      expect(err.message).toBe('kod_bulunamadi')
    })
  })
})
