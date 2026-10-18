import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, achievements, emptyStats, medalTier } from '../gamification'
import { drawnMedal } from '../../ui/drawnArt'

describe('guide badges', () => {
  it('defines the required grammar guide achievements', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(ids).toContain('guide-lesson-1')
    expect(ids).toContain('guide-lessons-5')
    expect(ids).toContain('guide-lessons-10')
    expect(ids).toContain('guide-lessons-25')
    expect(ids).toContain('guide-lessons-50')
    expect(ids).toContain('guide-cert-1')
    expect(ids).toContain('guide-cert-3')
    expect(ids).toContain('guide-placement-1')
  })

  it('assigns correct medal tiers to guide badges', () => {
    const lesson1 = ACHIEVEMENTS.find((a) => a.id === 'guide-lesson-1')!
    const lesson10 = ACHIEVEMENTS.find((a) => a.id === 'guide-lessons-10')!
    const lesson50 = ACHIEVEMENTS.find((a) => a.id === 'guide-lessons-50')!
    expect(medalTier(lesson1)).toBe('bronze')
    expect(medalTier(lesson10)).toBe('silver')
    expect(medalTier(lesson50)).toBe('gold')

    const cert1 = ACHIEVEMENTS.find((a) => a.id === 'guide-cert-1')!
    const cert3 = ACHIEVEMENTS.find((a) => a.id === 'guide-cert-3')!
    expect(medalTier(cert1)).toBe('bronze')
    expect(medalTier(cert3)).toBe('gold')

    const placement1 = ACHIEVEMENTS.find((a) => a.id === 'guide-placement-1')!
    expect(medalTier(placement1)).toBe('special')
  })

  it('binds drawn medal artwork to all guide stats', () => {
    expect(drawnMedal('guideLessonsLearned')).toBeTruthy()
    expect(drawnMedal('guideCertsEarned')).toBeTruthy()
    expect(drawnMedal('guidePlacementDone')).toBeTruthy()
  })

  it('unlocks badges when stats meet goals', () => {
    const locked = achievements(emptyStats)
    expect(locked.find((a) => a.id === 'guide-lessons-10')?.unlocked).toBe(false)
    expect(locked.find((a) => a.id === 'guide-cert-1')?.unlocked).toBe(false)
    expect(locked.find((a) => a.id === 'guide-placement-1')?.unlocked).toBe(false)

    const unlocked = achievements({
      ...emptyStats,
      guideLessonsLearned: 12,
      guideCertsEarned: 1,
      guidePlacementDone: 1,
    })
    expect(unlocked.find((a) => a.id === 'guide-lesson-1')?.unlocked).toBe(true)
    expect(unlocked.find((a) => a.id === 'guide-lessons-5')?.unlocked).toBe(true)
    expect(unlocked.find((a) => a.id === 'guide-lessons-10')?.unlocked).toBe(true)
    expect(unlocked.find((a) => a.id === 'guide-lessons-25')?.unlocked).toBe(false)
    expect(unlocked.find((a) => a.id === 'guide-cert-1')?.unlocked).toBe(true)
    expect(unlocked.find((a) => a.id === 'guide-placement-1')?.unlocked).toBe(true)
  })
})
