import { describe, expect, it } from 'vitest'
import { ghostRival, hidesXp, presenceDays, studiedBetween, weekDays } from './friendMetrics'

describe('friend metrics', () => {
  it('counts the days studied, not the XP', () => {
    const days = { '2026-10-26': 120, '2026-10-27': 0, '2026-10-28': 5, '2026-10-29': 40 }
    expect(studiedBetween(days, '2026-10-26', '2026-10-29')).toBe(3)
    // 2026-10-28 is a Wednesday: the week so far is Monday to Wednesday.
    expect(weekDays(days, '2026-10-28')).toBe(2)
    expect(weekDays({}, '2026-10-28')).toBe(0)
  })

  it('shares days only as a 1 on each day studied, and recognises such a card', () => {
    const shared = presenceDays({ '2026-10-26': 120, '2026-10-27': 0, '2026-10-28': 5 })
    expect(shared).toEqual({ '2026-10-26': 1, '2026-10-28': 1 })
    expect(hidesXp(shared)).toBe(true)
    expect(hidesXp({ '2026-10-26': 1, '2026-10-28': 40 })).toBe(false)
    expect(hidesXp({})).toBe(false)
    // The days studied survive the sharing: that is what the steadiness board counts.
    expect(studiedBetween(shared, '2026-10-26', '2026-10-28')).toBe(2)
  })

  describe('Monki as a study partner', () => {
    const mine = { '2026-10-20': 60, '2026-10-21': 80, '2026-10-22': 0, '2026-10-23': 70 }
    it('is the same on every call and every device', () => {
      expect(ghostRival(mine, '2026-10-28', 20)).toEqual(ghostRival(mine, '2026-10-28', 20))
    })
    it('keeps a pace near the learner’s own, with rest days now and then', () => {
      const ghost = ghostRival(mine, '2026-10-28', 23)
      const xp = Object.values(ghost.days)
      expect(xp.length).toBeGreaterThan(8)
      expect(xp.length).toBeLessThanOrEqual(14)
      const average = xp.reduce((a, b) => a + b, 0) / xp.length
      expect(average).toBeGreaterThan(40)
      expect(average).toBeLessThan(110)
    })
    it('has no history to follow for a new learner: a gentle 40 XP or so', () => {
      const ghost = ghostRival({}, '2026-10-28', 23)
      for (const xp of Object.values(ghost.days)) {
        expect(xp).toBeGreaterThan(25)
        expect(xp).toBeLessThan(65)
      }
    })
    it('grows through today so it can be caught', () => {
      const morning = ghostRival(mine, '2026-10-28', 7).today
      const noon = ghostRival(mine, '2026-10-28', 15).today
      const night = ghostRival(mine, '2026-10-28', 23).today
      expect(morning).toBe(0)
      expect(noon).toBeLessThanOrEqual(night)
    })
  })
})
