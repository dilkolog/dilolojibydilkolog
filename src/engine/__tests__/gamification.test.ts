import { describe, expect, it } from 'vitest'
import {
  achievements,
  computeXp,
  INTRO_XP,
  levelFromXp,
  longestStreak,
  perfectDays,
  xpForAnswer,
  xpToNext,
  type GameStats,
} from '../gamification'
import { questBonus } from '../quests'
import type { ReviewEvent } from '../types'

const NOW = new Date('2026-10-10T12:00:00')
const base = { exerciseType: 'typed_translation' as const, verdict: 'correct' as const, hintsUsed: 0, responseMs: 7000, mode: 'normal' as const, combo: 0 }

describe('xpForAnswer', () => {
  it('rewards harder retrieval more', () => {
    expect(xpForAnswer({ ...base, exerciseType: 'mc_meaning', responseMs: 3000 })).toBeLessThan(xpForAnswer(base))
    expect(xpForAnswer({ ...base, exerciseType: 'free_sentence', responseMs: 40000 })).toBe(20)
  })
  it('gives 1 XP for trying, half for near misses, less with hints', () => {
    expect(xpForAnswer({ ...base, verdict: 'wrong' })).toBe(1)
    expect(xpForAnswer({ ...base, verdict: 'near' })).toBe(5)
    expect(xpForAnswer({ ...base, hintsUsed: 2 })).toBe(5)
  })
  it('adds a speed bonus, a combo multiplier, and reduces practice XP', () => {
    expect(xpForAnswer({ ...base, responseMs: 1000 })).toBe(12)
    expect(xpForAnswer({ ...base, combo: 10 })).toBe(15)
    expect(xpForAnswer({ ...base, mode: 'practice' })).toBe(3)
  })
})

describe('computeXp', () => {
  const ev = (minutes: number, verdict: 'correct' | 'wrong' = 'correct', daysAgo = 0): ReviewEvent =>
    ({ ...base, id: String(Math.random()), entryId: 'x', language: 'en', skill: 'recall', direction: 'native_to_target', correct: verdict === 'correct', verdict, rating: 3, retrievabilityBefore: 0, stabilityAfter: 1, scheduledDays: 1, timestamp: new Date(NOW.getTime() - daysAgo * 86_400_000 + minutes * 60_000) }) as ReviewEvent

  it('sums answers and introductions, tracks today and the longest combo', () => {
    const events = [ev(0), ev(1), ev(2, 'wrong'), ev(3), ev(0, 'correct', 1)]
    const xp = computeXp(events, [NOW], NOW)
    // Too little activity to complete any quest (all quest targets are higher).
    expect(xp.total).toBe(10 * 4 + 1 + INTRO_XP)
    expect(xp.today).toBe(10 * 3 + 1 + INTRO_XP)
    expect(xp.maxCombo).toBe(2)
  })

  it('breaks a combo after a long pause', () => {
    const quick = Array.from({ length: 6 }, (_, i) => ev(i))
    expect(computeXp(quick, [], NOW).maxCombo).toBe(6)
    // 15-minute gaps exceed the combo window, so the run restarts each time.
    const slow = Array.from({ length: 6 }, (_, i) => ev(i * 15))
    expect(computeXp(slow, [], NOW).maxCombo).toBe(1)
    const bonus = [...questBonus(slow, []).values()].reduce((a, b) => a + b, 0)
    expect(computeXp(slow, [], NOW).total).toBe(60 + bonus)
  })
})

describe('levels', () => {
  it('starts at level 1 and gets steeper', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, title: 'Çaylak', into: 0 })
    expect(levelFromXp(xpToNext(1)).level).toBe(2)
    expect(xpToNext(10)).toBeGreaterThan(xpToNext(5) * 2.5)
    let total = 0
    for (let l = 1; l < 10; l++) total += xpToNext(l)
    expect(total).toBeGreaterThan(10_000)
    expect(levelFromXp(total).level).toBe(10)
    expect(levelFromXp(total).title).toBe('Çırak')
  })
})

describe('achievements', () => {
  const stats: GameStats = { wordsIntroduced: 60, mastered: 0, totalAnswers: 120, longestStreak: 7, perfectDays: 0, maxCombo: 12, languagesStudied: 1, wordsWithPicture: 2, wordsWithRecording: 0, freeSentencesCorrect: 0, level: 3 }
  it('reports unlocked badges and progress toward the rest', () => {
    const a = achievements(stats)
    const get = (id: string) => a.find((x) => x.id === id)!
    expect(get('words-50').unlocked).toBe(true)
    expect(get('words-250')).toMatchObject({ unlocked: false, value: 60, goal: 250 })
    expect(get('streak-7').unlocked).toBe(true)
    expect(get('combo-10').unlocked).toBe(true)
    expect(get('pictures-10').value).toBe(2)
  })

  it('computes the longest streak and perfect days from history', () => {
    const at = (d: number, verdict: 'correct' | 'wrong' = 'correct') => ({ timestamp: new Date(NOW.getTime() - d * 86_400_000), mode: 'normal' as const, verdict }) as ReviewEvent
    expect(longestStreak([at(10), at(9), at(8), at(5), at(4)])).toBe(3)
    expect(perfectDays([...Array(20)].map(() => at(1)))).toBe(1)
    expect(perfectDays([...[...Array(20)].map(() => at(2)), at(2, 'wrong')])).toBe(0)
  })
})
