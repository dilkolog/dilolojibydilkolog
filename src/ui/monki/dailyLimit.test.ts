// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { askedToday, countAsk, overLimit } from './dailyLimit'

describe('Monki daily limit', () => {
  beforeEach(() => localStorage.clear())
  const day = (d: string) => new Date(`${d}T12:00:00`)

  it('counts questions within a day and starts over the next day', () => {
    countAsk(day('2026-10-24'))
    countAsk(day('2026-10-24'))
    expect(askedToday(day('2026-10-24'))).toBe(2)
    expect(askedToday(day('2026-10-25'))).toBe(0)
    countAsk(day('2026-10-25'))
    expect(askedToday(day('2026-10-25'))).toBe(1)
  })

  it('is over the limit at the limit, never when there is none', () => {
    for (let i = 0; i < 3; i++) countAsk(day('2026-10-24'))
    expect(overLimit(3, day('2026-10-24'))).toBe(true)
    expect(overLimit(4, day('2026-10-24'))).toBe(false)
    expect(overLimit(0, day('2026-10-24'))).toBe(false)
  })

  it('reads a damaged value as zero', () => {
    localStorage.setItem('diloloji:monki-count', '{"day":"2026-10-24","n":"x"}')
    expect(askedToday(day('2026-10-24'))).toBe(0)
    localStorage.setItem('diloloji:monki-count', 'not json')
    expect(askedToday(day('2026-10-24'))).toBe(0)
  })
})
