import { describe, expect, it } from 'vitest'
import { DRAWN_AVATARS, DRAWN_AVATAR_IDS, EARNED_AVATARS, LEGACY_AVATAR_IDS, MONKI_AVATAR, avatarNeed, drawnAvatarName, isFigureAvatar } from './avatarArt'

describe('avatars to earn', () => {
  it('each has its picture, a name and a goal, and is shown like any drawn avatar, round', () => {
    for (const a of EARNED_AVATARS) {
      expect(DRAWN_AVATARS[a.id]).toBe(a.art)
      expect(drawnAvatarName(a.id)).toBe(a.name)
      expect(a.goal).toBeGreaterThan(0)
      expect(isFigureAvatar(a.id)).toBe(false)
    }
    expect(new Set(EARNED_AVATARS.map((a) => a.id)).size).toBe(EARNED_AVATARS.length)
  })

  it('keep their ids and goals: a profile that earned one keeps it', () => {
    expect(EARNED_AVATARS.map((a) => `${a.id}:${a.stat}:${a.goal}`).sort()).toEqual(
      [
        'boss-blob:bossesDefeated:1', 'stat-sprout:mastered:10', 'boss-ghost:longestStreak:7', 'boss-slime:bossesDefeated:3',
        'stat-star:longestStreak:10', 'boss-octopus:longestStreak:14', 'boss-dino:mastered:50', 'boss-yeti:bossesDefeated:10',
        'boss-chronos:bossesDefeated:15', 'boss-dragon:longestStreak:30', 'boss-golem:mastered:200', 'stat-book:mastered:300',
      ].sort(),
    )
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

describe('the collection (avatar-koleksiyonu-01)', () => {
  it('offers the 40 figures and no Monki', () => {
    const offered = [...DRAWN_AVATAR_IDS, ...EARNED_AVATARS.map((a) => a.id)]
    expect(offered).toHaveLength(40)
    expect(new Set(offered).size).toBe(40)
    expect(offered.some((id) => id === MONKI_AVATAR || /monki|sticker-/.test(id))).toBe(false)
    for (const id of ['red-panda', 'otter', 'capybara', 'hedgehog', 'raccoon', 'sloth', 'squirrel', 'elephant', 'parrot', 'whale', 'seal', 'axolotl', 'turtle', 'bee']) {
      expect(DRAWN_AVATAR_IDS).toContain(id)
      expect(drawnAvatarName(id)).not.toBe(id)
    }
  })

  it('still shows every value an old profile may hold: the animals, Monki and the Monki outfits', () => {
    for (const id of ['fox', 'panda', 'owl', 'cat', 'penguin', 'rabbit', 'octopus', 'koala', 'dog', 'bear', 'frog', 'lion', 'deer', 'tiger']) expect(DRAWN_AVATARS[id]).toBeTruthy()
    expect(LEGACY_AVATAR_IDS).toEqual(
      expect.arrayContaining([MONKI_AVATAR, 'monki-wave', 'sticker-coffee', 'monki-scarf', 'monki-student', 'monki-explorer', 'monki-think', 'sticker-music', 'sticker-thumbs', 'monki-hang', 'sticker-party', 'monki-graduate', 'monki-sleep', 'sticker-read', 'monki-king', 'monki-cheer']),
    )
    for (const id of LEGACY_AVATAR_IDS) {
      expect(DRAWN_AVATARS[id]).toBeTruthy()
      expect(drawnAvatarName(id)).toMatch(/Monki/)
    }
    // The round Monki stays round; the outfits stay whole figures, as they were drawn.
    expect(isFigureAvatar(MONKI_AVATAR)).toBe(false)
    expect(isFigureAvatar('monki-king')).toBe(true)
  })
})
