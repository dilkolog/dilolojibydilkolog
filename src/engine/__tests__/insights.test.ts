import { describe, expect, it } from 'vitest'
import { errorBreakdown, hardWords, reviewForecast, streakWithFreezes, weekReport } from '../insights'
import { localDate } from '../progress'
import { dailyQuests, dayMetrics, questBonus, questStatus } from '../quests'
import { newWordState, processAttempt } from '../review'
import { createScheduler } from '../scheduler'
import type { ReviewEvent } from '../types'
import { decide, decision } from './fixtures'

const NOW = new Date('2026-10-20T12:00:00')
const day = (n: number) => localDate(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n, 12))
const ev = (daysAgo: number, over: Partial<ReviewEvent> = {}): ReviewEvent =>
  ({
    id: String(Math.random()),
    entryId: 'en:decision',
    language: 'en',
    skill: 'recall',
    exerciseType: 'typed_translation',
    direction: 'native_to_target',
    verdict: 'correct',
    correct: true,
    rating: 3,
    responseMs: 5000,
    hintsUsed: 0,
    retrievabilityBefore: 0,
    stabilityAfter: 1,
    scheduledDays: 1,
    mode: 'normal',
    timestamp: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - daysAgo, 10),
    ...over,
  }) as ReviewEvent

describe('streakWithFreezes', () => {
  it('counts a plain streak and keeps it alive before today is studied', () => {
    expect(streakWithFreezes([day(3), day(2), day(1)], NOW).streak).toBe(3)
  })
  it('earns a freeze every 7 days and uses it for a missed day', () => {
    const days = [10, 9, 8, 7, 6, 5, 4, /* 3 missed */ 2, 1].map(day)
    const s = streakWithFreezes(days, NOW)
    expect(s.streak).toBe(9)
    expect(s.frozenDays).toEqual([day(3)])
    expect(s.freezes).toBe(0)
  })
  it('breaks without a freeze', () => {
    expect(streakWithFreezes([day(5), day(4), day(2), day(1)], NOW).streak).toBe(2)
  })
})

describe('daily quests', () => {
  it('picks three distinct quests deterministically per day', () => {
    const q = dailyQuests('2026-10-20')
    expect(q).toHaveLength(3)
    expect(new Set(q.map((x) => x.def.id)).size).toBe(3)
    expect(dailyQuests('2026-10-20')).toEqual(q)
  })
  it('measures a day and awards bonus XP for completed quests', () => {
    const events = Array.from({ length: 60 }, (_, i) => ev(0, { timestamp: new Date(NOW.getTime() - i * 1000) }))
    const m = dayMetrics(events, 10)
    expect(m).toMatchObject({ answers: 60, correct: 60, combo: 60, typedCorrect: 60, noHintCorrect: 60, newWords: 10 })
    const status = questStatus(localDate(NOW), m)
    expect(status.every((q) => q.done)).toBe(true)
    const intros = Array.from({ length: 10 }, () => NOW)
    expect(questBonus(events, intros).get(localDate(NOW))).toBe(status.reduce((s, q) => s + q.xp, 0))
  })
  it('ignores practice-mode answers', () => {
    expect(dayMetrics([ev(0, { mode: 'practice' })], 0).answers).toBe(0)
  })
})

describe('forecast, hard words, report', () => {
  const scheduler = createScheduler({ fuzz: false })
  it('forecasts due words per day, overdue on today', () => {
    const s = processAttempt(newWordState(decision, NOW), { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 3000, hintsUsed: 0, maxHints: 0, at: new Date(NOW.getTime() - 30 * 86_400_000) }, [], scheduler, () => 'x').state
    const f = reviewForecast([s, newWordState(decide, NOW)], NOW, 7)
    expect(f).toHaveLength(7)
    expect(f[0]).toEqual({ date: localDate(NOW), count: 1 })
  })
  it('ranks hard words by miss rate and breaks down error types', () => {
    const events = [
      ...[0, 0, 0].map(() => ev(0, { entryId: 'a', verdict: 'wrong', errorType: 'gender' })),
      ev(0, { entryId: 'a' }),
      ...[0, 0].map(() => ev(0, { entryId: 'b', verdict: 'wrong', errorType: 'accent' })),
      ev(0, { entryId: 'b' }),
      ev(0, { entryId: 'b' }),
      ev(0, { entryId: 'c', verdict: 'wrong' }),
    ]
    expect(hardWords(events).map((h) => h.entryId)).toEqual(['a', 'b'])
    expect(errorBreakdown(events)).toEqual({ gender: 3, accent: 2 })
  })
  it('compares this week with last week', () => {
    const r = weekReport([ev(0), ev(1, { verdict: 'wrong' }), ev(9)], [NOW], new Map([[localDate(NOW), 40]]), NOW)
    expect(r.thisWeek).toMatchObject({ answers: 2, correct: 1, accuracy: 0.5, xp: 40, newWords: 1, daysStudied: 2 })
    expect(r.lastWeek.answers).toBe(1)
  })
})
