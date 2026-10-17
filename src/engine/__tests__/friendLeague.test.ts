import { describe, expect, it } from 'vitest'
import { addLeagueWin, lastWeekLeague, teamWeek, weekStartOf, xpBetween, type LeagueEntry } from '../friendLeague'

// 2026-10-14 is a Wednesday: this week started Monday the 12th, last week ran 5th–11th.
const TODAY = '2026-10-14'
const entry = (name: string, days: Record<string, number>, me = false): LeagueEntry => ({ code: name.toUpperCase(), name, me, days })

describe('weekStartOf', () => {
  it('is the Monday of the week, weeks run Monday to Sunday', () => {
    expect(weekStartOf('2026-10-14')).toBe('2026-10-12')
    expect(weekStartOf('2026-10-12')).toBe('2026-10-12')
    expect(weekStartOf('2026-10-18')).toBe('2026-10-12')
    expect(weekStartOf('2026-10-19')).toBe('2026-10-19')
  })
})

describe('xpBetween', () => {
  it('adds the days inside, both ends included', () => {
    expect(xpBetween({ '2026-10-05': 10, '2026-10-11': 20, '2026-10-12': 40 }, '2026-10-05', '2026-10-11')).toBe(30)
  })
})

describe('lastWeekLeague', () => {
  it('ranks last week (Mon 5th to Sun 11th) and names the winner', () => {
    const league = lastWeekLeague([entry('Ben', { '2026-10-06': 100, '2026-10-12': 500 }, true), entry('Ali', { '2026-10-07': 150, '2026-10-10': 60 }), entry('Veli', { '2026-10-04': 900 })], TODAY)!
    expect(league.weekStart).toBe('2026-10-05')
    expect(league.weekEnd).toBe('2026-10-11')
    expect(league.rows.map((r) => [r.name, r.xp])).toEqual([['Ali', 210], ['Ben', 100], ['Veli', 0]])
    expect(league.winners).toEqual(['ALI'])
  })
  it('a tie shares the first place, me first in the list', () => {
    const league = lastWeekLeague([entry('Ali', { '2026-10-06': 80 }), entry('Ben', { '2026-10-07': 80 }, true)], TODAY)!
    expect(league.rows[0].name).toBe('Ben')
    expect(league.winners.sort()).toEqual(['ALI', 'BEN'])
  })
  it('has none when alone or when nobody studied', () => {
    expect(lastWeekLeague([entry('Ben', { '2026-10-06': 100 }, true)], TODAY)).toBeNull()
    expect(lastWeekLeague([entry('Ben', {}, true), entry('Ali', { '2026-10-13': 50 })], TODAY)).toBeNull()
  })
})

describe('addLeagueWin', () => {
  it('keeps each week once, newest first', () => {
    expect(addLeagueWin(['2026-09-28'], '2026-10-05')).toEqual(['2026-10-05', '2026-09-28'])
    expect(addLeagueWin(['2026-10-05'], '2026-10-05')).toEqual(['2026-10-05'])
  })
})

describe('teamWeek', () => {
  it('adds everyone\'s XP from Monday to today against the goal', () => {
    const t = teamWeek([entry('Ben', { '2026-10-12': 200, '2026-10-14': 100 }, true), entry('Ali', { '2026-10-13': 350, '2026-10-11': 999 })], TODAY, 1000)
    expect(t.xp).toBe(650)
    expect(t.percent).toBe(65)
    expect(t.done).toBe(false)
    expect(t.parts.map((p) => p.name)).toEqual(['Ali', 'Ben'])
  })
  it('is done at the goal, and never over 100 per cent', () => {
    const t = teamWeek([entry('Ben', { '2026-10-13': 900 }, true), entry('Ali', { '2026-10-14': 700 })], TODAY, 1000)
    expect(t.percent).toBe(100)
    expect(t.done).toBe(true)
  })
})
