import { describe, expect, it } from 'vitest'
import { addVisit, partsSummary, trackedSince, usageLabel, usageSummary, type UsageLog } from './screenUsage'

const at = (d: number) => new Date(2026, 9, d, 12)

describe('screen usage', () => {
  it('counts opens per day and sums the last 30 days, most used first', () => {
    let log: UsageLog = {}
    for (const [screen, day] of [['home', 1], ['home', 1], ['home', 2], ['reading', 2], ['games', 20]] as const) log = addVisit(log, screen, at(day))
    expect(log.home).toEqual({ '2026-10-01': 2, '2026-10-02': 1 })
    expect(usageSummary(log, at(20))).toEqual([
      { screen: 'home', opens: 3, days: 2 },
      { screen: 'games', opens: 1, days: 1 },
      { screen: 'reading', opens: 1, days: 1 },
    ])
    // A month on, the early days are out of the window.
    expect(usageSummary(log, new Date(2026, 10, 15)).map((u) => u.screen)).toEqual(['games'])
    expect(trackedSince(log)).toBe('2026-10-01')
  })

  it('keeps two months and drops older days on the next visit', () => {
    const log = addVisit({ home: { '2026-07-01': 5, '2026-09-30': 1 }, story: { '2026-06-01': 2 } }, 'home', at(7))
    expect(log).toEqual({ home: { '2026-09-30': 1, '2026-10-07': 1 } })
    expect(trackedSince({})).toBeNull()
  })

  it('lists the verb lab\'s tabs and modes apart from the screens, with their names', () => {
    let log: UsageLog = {}
    for (const screen of ['verbs', 'verbs:learn', 'verbs:practice', 'verbs:practice:choose', 'verbs:practice:choose', 'verbs:learn']) log = addVisit(log, screen, at(3))
    expect(usageSummary(log, at(5)).map((u) => u.screen)).toEqual(['verbs'])
    expect(partsSummary(log, 'verbs', at(5)).map((u) => [usageLabel(u.screen), u.opens])).toEqual([
      ['Öğren', 2],
      ['Alıştırma · Seç', 2],
      ['Alıştırma', 1],
    ])
    expect(usageLabel('reading')).toBe('Okuma')
    expect(usageLabel('games:grammar')).toBe('Dilbilgisi soruları')
    expect(usageLabel('games:nope')).toBe('nope')
    expect(usageLabel('verbs:mastery')).toBe('İlerleme')
  })
})
