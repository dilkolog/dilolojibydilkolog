import { describe, expect, it } from 'vitest'
import { crossedMilestone, type GameStats } from '../gamification'

const stats = (over: Partial<GameStats>) => ({ wordsIntroduced: 0, mastered: 0, ...over }) as GameStats

describe('milestones', () => {
  it('celebrates a new level first, then settled words, then words met', () => {
    expect(crossedMilestone({ level: 3, stats: stats({}) }, { level: 4, stats: stats({ mastered: 1 }) })?.id).toBe('level-4')
    expect(crossedMilestone({ level: 3, stats: stats({ mastered: 0, wordsIntroduced: 9 }) }, { level: 3, stats: stats({ mastered: 1, wordsIntroduced: 10 }) })?.id).toBe('mastered-1')
    expect(crossedMilestone({ level: 3, stats: stats({ wordsIntroduced: 98 }) }, { level: 3, stats: stats({ wordsIntroduced: 101 }) })?.id).toBe('words-100')
  })

  it('stays quiet when nothing was crossed', () => {
    expect(crossedMilestone({ level: 3, stats: stats({ wordsIntroduced: 11, mastered: 2 }) }, { level: 3, stats: stats({ wordsIntroduced: 14, mastered: 3 }) })).toBeNull()
  })
})
