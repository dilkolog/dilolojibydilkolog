import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, type AchievementState } from '../engine/gamification'
import { byTier, TIER_NAME } from './badgeTier'

describe('badgeTier', () => {
  it('maps medal tiers to Turkish labels', () => {
    expect(TIER_NAME.bronze).toBe('Bronz')
    expect(TIER_NAME.silver).toBe('Gümüş')
    expect(TIER_NAME.gold).toBe('Altın')
    expect(TIER_NAME.special).toBe('Özel')
  })

  it('sorts achievements by tier: bronze < silver < special < gold', () => {
    const bronzeAch = ACHIEVEMENTS.find((a) => a.id === 'first-word')!
    const silverAch = ACHIEVEMENTS.find((a) => a.id === 'words-250')!
    const goldAch = ACHIEVEMENTS.find((a) => a.id === 'words-1000')!

    const toState = (ach: typeof bronzeAch): AchievementState => ({
      ...ach,
      value: ach.goal,
      unlocked: true,
    })

    const list: AchievementState[] = [toState(goldAch), toState(bronzeAch), toState(silverAch)]
    const sorted = [...list].sort(byTier)

    expect(sorted.map((s) => s.id)).toEqual(['first-word', 'words-250', 'words-1000'])
  })
})
