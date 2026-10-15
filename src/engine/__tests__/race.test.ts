import { describe, expect, it } from 'vitest'
import { weeklyRace, weekStart } from '../race'

describe('race engine', () => {
  it('computes weekStart to Monday 00:00:00 local', () => {
    // 2026-10-14 is Wednesday
    const wed = new Date(2026, 9, 14, 15, 30, 0)
    const mon = weekStart(wed)
    expect(mon.getDay()).toBe(1) // Monday
    expect(mon.getDate()).toBe(12) // 2026-10-12
    expect(mon.getHours()).toBe(0)
    expect(mon.getMinutes()).toBe(0)

    // Sunday (2026-10-18) belongs to the week starting Monday 2026-10-12
    const sun = new Date(2026, 9, 18, 23, 0, 0)
    const sunStart = weekStart(sun)
    expect(sunStart.getDate()).toBe(12)
  })

  it('calculates thisWeek vs lastWeek progress accurately', () => {
    // Wednesday Oct 14, 2026
    const wed = new Date(2026, 9, 14, 12, 0, 0)
    const byDay = new Map<string, number>([
      // This week: Oct 12 (Mon), 13 (Tue), 14 (Wed)
      ['2026-10-12', 50],
      ['2026-10-13', 30],
      ['2026-10-14', 20],
      // Last week: Oct 5 (Mon) .. Oct 11 (Sun)
      ['2026-10-05', 40],
      ['2026-10-06', 40],
      ['2026-10-07', 40], // Wed so far: 40 + 40 + 40 = 120
      ['2026-10-08', 50],
      ['2026-10-09', 50],
      ['2026-10-10', 50],
      ['2026-10-11', 50], // Total last week: 320
    ])

    const race = weeklyRace(byDay, wed)
    expect(race.thisWeek).toBe(100) // 50 + 30 + 20
    expect(race.lastWeekSoFar).toBe(120) // 40 + 40 + 40
    expect(race.lastWeekTotal).toBe(320)
  })

  it('calculates past weekly win streak', () => {
    // Current date: Monday Oct 26, 2026
    const now = new Date(2026, 9, 26, 12, 0, 0)
    const byDay = new Map<string, number>([
      // Week -1 (Oct 19-25): total 500
      ['2026-10-19', 500],
      // Week -2 (Oct 12-18): total 400 (Week -1 > Week -2: streak 1)
      ['2026-10-12', 400],
      // Week -3 (Oct 5-11): total 300 (Week -2 > Week -3: streak 2)
      ['2026-10-05', 300],
      // Week -4 (Sep 28-Oct 4): total 350 (Week -3 < Week -4: streak broken)
      ['2026-09-28', 350],
    ])

    const race = weeklyRace(byDay, now)
    expect(race.streak).toBe(2)
  })
})
