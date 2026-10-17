import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  BADGE_CATEGORIES,
  badgeCategory,
  emptyStats,
  medalTier,
  achievements,
  comebackBonus,
  computeXp,
  fatigueFactor,
  INTRO_XP,
  isComeback,
  isHardWord,
  levelFromXp,
  longestStreak,
  nextCombo,
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

describe('the finer XP rules', () => {
  it('halves a run on a wrong answer instead of ending it, and ends a short one', () => {
    expect(nextCombo(12, 'wrong')).toBe(6)
    expect(nextCombo(1, 'wrong')).toBe(0)
    expect(nextCombo(12, 'near')).toBe(13)
    expect(nextCombo(0, 'correct')).toBe(1)
  })

  it('adds 3 XP for a word about to be forgotten, but not for a first meeting, a hint or practice', () => {
    expect(xpForAnswer({ ...base, retrievability: 0.5 })).toBe(10 + 3)
    expect(xpForAnswer({ ...base, retrievability: 0 })).toBe(10)
    expect(xpForAnswer({ ...base, retrievability: 0.9 })).toBe(10)
    expect(xpForAnswer({ ...base, retrievability: 0.5, hintsUsed: 1 })).toBe(8)
    expect(xpForAnswer({ ...base, retrievability: 0.5, mode: 'practice' })).toBe(3)
    expect(xpForAnswer({ ...base, retrievability: 0.5, verdict: 'near' })).toBe(5)
  })

  it('weighs a right answer on a hard word 20% more', () => {
    expect(isHardWord(10, 4)).toBe(true)
    expect(isHardWord(10, 3)).toBe(false)
    expect(isHardWord(3, 3)).toBe(false)
    expect(xpForAnswer({ ...base, wordReviews: 10, wordWrong: 5 })).toBe(12)
    expect(xpForAnswer({ ...base, wordReviews: 10, wordWrong: 5, verdict: 'wrong' })).toBe(1)
  })

  it('pays half after 150 answers a day and a quarter after 300, but never less than one', () => {
    expect(fatigueFactor(149)).toBe(1)
    expect(fatigueFactor(150)).toBe(0.5)
    expect(fatigueFactor(300)).toBe(0.25)
    expect(xpForAnswer({ ...base, answersToday: 150 })).toBe(5)
    expect(xpForAnswer({ ...base, answersToday: 300 })).toBe(3)
    expect(xpForAnswer({ ...base, exerciseType: 'mc_meaning', answersToday: 900 })).toBe(1)
    expect(xpForAnswer({ ...base, verdict: 'wrong', answersToday: 900 })).toBe(1)
  })

  it('computeXp applies them per day, word and run, and the badges keep counting the strict streak', () => {
    const e = (entryId: string, minutes: number, verdict: 'correct' | 'wrong', day = 10, r = 0): ReviewEvent =>
      ({ ...base, id: `${entryId}${minutes}${day}`, entryId, language: 'en', skill: 'recall', direction: 'native_to_target', correct: verdict === 'correct', verdict, rating: 3, retrievabilityBefore: r, stabilityAfter: 1, scheduledDays: 1, timestamp: new Date(2026, 9, day, 12, minutes) }) as ReviewEvent
    // Ten right in a row, one slip, then one right: the slip halves the run (10 -> 5), so the next answer is x1.2.
    const run = [...Array.from({ length: 10 }, (_, i) => e(`w${i}`, i, 'correct')), e('z', 10, 'wrong'), e('y', 11, 'correct')]
    const xp = computeXp(run, [], NOW)
    expect(xp.maxCombo).toBe(10)
    const plain = [...Array.from({ length: 10 }, (_, i) => e(`w${i}`, i, 'correct')), e('z', 10, 'wrong')]
    const gained = xp.byDay.get('2026-10-10')! - computeXp(plain, [], NOW).byDay.get('2026-10-10')!
    expect(gained).toBe(12)
    // A word saved from forgetting.
    expect(computeXp([e('s', 0, 'correct', 10, 0.4)], [], NOW).total).toBe(10 + 3)
    // Past the cap: the 151st answer, in a run of x2, pays half of 20.
    const grind = (n: number) => Array.from({ length: n }, (_, i) => e(`g${i}`, i % 60, 'correct', 10, 0))
    const net = (events: ReviewEvent[]) => computeXp(events, [], NOW).total - [...questBonus(events, []).values()].reduce((x, y) => x + y, 0)
    expect(net(grind(151)) - net(grind(150))).toBe(10)
  })

  it('knows a comeback: three days or more since the last day with real answers', () => {
    expect(isComeback('2026-10-10', '2026-10-13')).toBe(true)
    expect(isComeback('2026-10-10', '2026-10-12')).toBe(false)
    expect(isComeback(null, '2026-10-13')).toBe(false)
    expect(isComeback(undefined, '2026-10-13')).toBe(false)
  })

  it('pays 10 XP for coming back after three days or more, with at least five real answers that day', () => {
    const at = (day: number, n: number, mode: 'normal' | 'practice' = 'normal'): ReviewEvent[] =>
      Array.from({ length: n }, (_, i) => ({ ...base, id: `${day}-${i}-${mode}`, entryId: `w${i}`, mode, timestamp: new Date(2026, 9, day, 10, i) }) as unknown as ReviewEvent)
    const bonus = comebackBonus([...at(1, 6), ...at(2, 6), ...at(6, 5), ...at(12, 4), ...at(20, 5, 'practice'), ...at(25, 5)])
    // Day 2 follows day 1; day 6 is back after four days; day 12 has too few answers; day 20 was practice only;
    // day 25 follows day 12 after thirteen days.
    expect([...bonus.entries()]).toEqual([['2026-10-06', 10], ['2026-10-25', 10]])
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
    expect(total).toBeGreaterThan(7_000)
    expect(levelFromXp(total).level).toBe(10)
    expect(levelFromXp(total).title).toBe('Çırak')
  })
})

describe('achievements', () => {
  const stats: GameStats = { ...emptyStats, wordsIntroduced: 60, totalAnswers: 120, longestStreak: 7, maxCombo: 12, languagesStudied: 1, wordsWithPicture: 2, level: 3, bossesDefeated: 1 }
  it('reports unlocked badges and progress toward the rest', () => {
    const a = achievements(stats)
    const get = (id: string) => a.find((x) => x.id === id)!
    expect(get('words-50').unlocked).toBe(true)
    expect(get('words-250')).toMatchObject({ unlocked: false, value: 60, goal: 250 })
    expect(get('streak-7').unlocked).toBe(true)
    expect(get('boss-1').unlocked).toBe(true)
    expect(get('boss-10')).toMatchObject({ unlocked: false, value: 1 })
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

describe('the badge set', () => {
  it('shelves every counted stat in a category', () => {
    for (const a of ACHIEVEMENTS) expect(BADGE_CATEGORIES.some((c) => c.id === badgeCategory(a)), a.id).toBe(true)
    for (const c of BADGE_CATEGORIES) expect(ACHIEVEMENTS.some((a) => badgeCategory(a) === c.id), c.name).toBe(true)
  })

  it('has unique ids, a reachable goal and a stat that is counted', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of ACHIEVEMENTS) {
      expect(a.goal, a.id).toBeGreaterThan(0)
      expect(a.stat in emptyStats, `${a.id} counts ${a.stat}`).toBe(true)
      expect(a.title.length, a.id).toBeGreaterThan(0)
    }
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(70)
  })

  it('gives each kind of badge bronze at the start and gold at the top, one-offs special', () => {
    const family = ACHIEVEMENTS.filter((a) => a.stat === 'longestStreak').sort((a, b) => a.goal - b.goal)
    expect(medalTier(family[0])).toBe('bronze')
    expect(medalTier(family.at(-1)!)).toBe('gold')
    const alone = ACHIEVEMENTS.filter((a) => ACHIEVEMENTS.filter((x) => x.stat === a.stat).length === 1)
    expect(alone.length).toBeGreaterThan(0)
    for (const a of alone) expect(medalTier(a)).toBe('special')
  })
})
