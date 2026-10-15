import { describe, expect, it } from 'vitest'
import { DRAWN_AVATARS, DRAWN_AVATAR_IDS, EARNED_AVATARS, avatarNeed, drawnAvatarName, isFigureAvatar } from './avatarArt'

describe('avatars to earn', () => {
  it('each has its picture, a name and a goal, and is shown like any drawn avatar', () => {
    for (const a of EARNED_AVATARS) {
      expect(DRAWN_AVATARS[a.id]).toBe(a.art)
      expect(drawnAvatarName(a.id)).toBe(a.name)
      expect(a.goal).toBeGreaterThan(0)
      expect(isFigureAvatar(a.id)).toBe(true)
    }
    expect(new Set(EARNED_AVATARS.map((a) => a.id)).size).toBe(EARNED_AVATARS.length)
  })

  it('the free ones stay free and round', () => {
    for (const id of DRAWN_AVATAR_IDS) expect(isFigureAvatar(id)).toBe(false)
    expect(EARNED_AVATARS.some((a) => DRAWN_AVATAR_IDS.includes(a.id))).toBe(false)
  })

  it('says what it takes in words', () => {
    expect(avatarNeed({ stat: 'level', goal: 8 })).toBe('Seviye 8')
    expect(avatarNeed({ stat: 'longestStreak', goal: 7 })).toBe('7 günlük seri')
    expect(avatarNeed({ stat: 'bossesDefeated', goal: 1 })).toBe('İlk boss')
    expect(avatarNeed({ stat: 'mastered', goal: 50 })).toBe('50 kelime "Oturdu"')
  })
})
