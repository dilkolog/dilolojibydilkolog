import { describe, expect, it } from 'vitest'
import { relativeTime } from './Screens'

describe('relativeTime', () => {
  const now = new Date(2026, 9, 1, 12, 0) // Thursday 1 Oct 2026
  it('describes the next review relative to today', () => {
    expect(relativeTime(new Date(2026, 9, 1, 14, 47), now)).toBe('bugün 14:47')
    expect(relativeTime(new Date(2026, 9, 2, 9, 0), now)).toBe('yarın 09:00')
    expect(relativeTime(new Date(2026, 9, 3, 10, 15), now)).toBe('cumartesi 10:15')
    expect(relativeTime(new Date(2026, 9, 12, 8, 0), now)).toBe('12 Ekim')
  })
})
