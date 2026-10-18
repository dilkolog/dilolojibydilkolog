import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { KelimeDB } from '../data/db'
import { ACHIEVEMENTS, medalTier } from '../engine/gamification'
import { drawnMedal } from './drawnArt'
import { loadGame } from './game'

const NOW = new Date(2026, 9, 18, 10, 0, 0)

describe('guide badges', () => {
  it('count the lessons learned and the certificates earned from the XP ledger, once each', async () => {
    const db = new KelimeDB('t-guide-badges')
    await db.awardXp([1, 2, 3, 4, 5].map((n) => ({ key: `lesson|topic${n}`, day: '2026-10-17', xp: 20 })))
    await db.awardXp([{ key: 'cert|fr|A1', day: '2026-10-17', xp: 100 }])
    // A review step and a time award are not lessons learned.
    await db.awardXp([{ key: 'review|topic1|1', day: '2026-10-18', xp: 10 }, { key: 'time|2026-10-18', day: '2026-10-18', xp: 5 }])
    const game = await loadGame(db, NOW)
    expect(game.stats.lessonsLearned).toBe(5)
    expect(game.stats.certificates).toBe(1)
    const state = (id: string) => game.achievements.find((a) => a.id === id)!
    expect(state('guide-5').value).toBe(5)
    expect(state('guide-5').unlocked).toBe(true)
    expect(state('guide-25').unlocked).toBe(false)
    expect(state('cert-1').unlocked).toBe(true)
    expect(state('cert-5').unlocked).toBe(false)
  })

  it('have a drawn medal and a tier like every other badge', () => {
    for (const a of ACHIEVEMENTS.filter((x) => x.stat === 'lessonsLearned' || x.stat === 'certificates')) {
      expect(drawnMedal(a.stat), a.id).toBeTruthy()
      expect(['bronze', 'silver', 'gold']).toContain(medalTier(a))
    }
  })
})
