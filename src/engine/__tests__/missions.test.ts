import { describe, expect, it } from 'vitest'
import { bestStars, MISSIONS, missionStars } from '../missions'

describe('missions', () => {
  it('every mission has a scenario and 3-5 goals', () => {
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length)
    for (const m of MISSIONS) {
      expect(m.scenario.length).toBeGreaterThan(20)
      expect(m.goals.length).toBeGreaterThanOrEqual(3)
      expect(m.goals.length).toBeLessThanOrEqual(5)
    }
  })

  it('stars: all goals and words 3, all goals 2, half 1', () => {
    expect(missionStars(4, 4, 3, 3)).toBe(3)
    expect(missionStars(4, 4, 1, 3)).toBe(2)
    expect(missionStars(2, 4, 3, 3)).toBe(1)
    expect(missionStars(1, 4, 3, 3)).toBe(0)
    expect(missionStars(4, 4, 0, 0)).toBe(3)
  })

  it('keeps the best result per mission and language', () => {
    const r = [
      { mission: 'rent', language: 'fr' as const, at: '1', stars: 1 as const },
      { mission: 'rent', language: 'fr' as const, at: '2', stars: 3 as const },
      { mission: 'rent', language: 'en' as const, at: '3', stars: 2 as const },
    ]
    expect(bestStars(r, 'fr')).toEqual({ rent: 3 })
  })
})
