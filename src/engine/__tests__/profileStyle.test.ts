import { describe, expect, it } from 'vitest'
import type { GameStats } from '../gamification'
import { availableTitles, BANNERS, bannerOf, daysUntil, FRAMES, frameOf, isUnlocked, pinnedBadges, titleName, toggleLimited, type Unlockables } from '../profileStyle'

const stats = { longestStreak: 0, mastered: 0 } as GameStats
const who = (over: { level?: number; badges?: Set<string>; stats?: Partial<GameStats> } = {}): Unlockables => ({ level: over.level ?? 1, badges: over.badges ?? new Set(), stats: { ...stats, ...over.stats } })

describe('profile styles', () => {
  it('opens a style by progress and keeps the free ones open', () => {
    const night = BANNERS.find((b) => b.id === 'night')!
    expect(isUnlocked(BANNERS[0], who())).toBe(true)
    expect(isUnlocked(night, who())).toBe(false)
    expect(isUnlocked(night, who({ stats: { longestStreak: 7 } }))).toBe(true)
    expect(isUnlocked(FRAMES.find((f) => f.id === 'crown')!, who({ level: 15 }))).toBe(true)
  })

  it('falls back to the default for an unknown banner or frame', () => {
    expect(bannerOf('nope')).toBe('color')
    expect(bannerOf(undefined)).toBe('color')
    expect(frameOf('gone')).toBe('ring')
    expect(frameOf('dots')).toBe('dots')
  })

  it('offers the titles of the levels reached and of the badges earned', () => {
    const u = who({ level: 11, badges: new Set(['boss-10']) })
    expect(availableTitles(u).map((t) => t.id)).toEqual(['auto', 'level:8', 'level:5', 'level:3', 'level:1', 'dragon'])
    expect(titleName('level:5', u)).toBe('Kaşif')
    expect(titleName('dragon', u)).toBe('Ejderha Avcısı')
    // A title no longer available, or none chosen, is the level's own.
    expect(titleName('writer', u)).toBe('Gezgin')
    expect(titleName(undefined, u)).toBe('Gezgin')
  })

  it('shows only pinned badges that are still earned, at most three', () => {
    const earned = new Set(['a', 'b', 'c', 'd'])
    expect(pinnedBadges(['a', 'x', 'b', 'c', 'd'], earned)).toEqual(['a', 'b', 'c'])
    expect(pinnedBadges(undefined, earned)).toEqual([])
  })

  it('toggles a choice within a ceiling', () => {
    expect(toggleLimited(['a'], 'b', 2)).toEqual(['a', 'b'])
    expect(toggleLimited(['a', 'b'], 'c', 2)).toEqual(['a', 'b'])
    expect(toggleLimited(['a', 'b'], 'a', 2)).toEqual(['b'])
    expect(toggleLimited(undefined, 'a', 2)).toEqual(['a'])
  })

  it('counts days to a goal date', () => {
    const now = new Date('2026-03-04T10:00:00')
    expect(daysUntil('2026-03-14', now)).toBe(10)
    expect(daysUntil('2026-03-04', now)).toBe(0)
    expect(daysUntil('2026-03-01', now)).toBe(-3)
    expect(daysUntil('', now)).toBeNull()
    expect(daysUntil('soon', now)).toBeNull()
  })
})
