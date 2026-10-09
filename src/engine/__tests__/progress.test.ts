import { describe, expect, it } from 'vitest'
import { State, type Card } from 'ts-fsrs'
import { createScheduler } from '../scheduler'
import {
  answeredToday,
  localDate,
  progressStats,
  studyStreak,
} from '../progress'
import { decision } from './fixtures'
import { newWordState } from '../review'
import type { ReviewEvent } from '../types'

describe('progress engine', () => {
  const scheduler = createScheduler({ fuzz: false })
  const now = new Date('2026-10-10T12:00:00Z')

  const makeCard = (days: number, stability: number, state = State.Review): Card => ({
    ...scheduler.newCard(now),
    reps: 2,
    last_review: new Date(now.getTime() - days * 86_400_000),
    due: new Date(now.getTime() + days * 86_400_000),
    stability,
    state,
  })

  describe('localDate', () => {
    it('formats date as YYYY-MM-DD with zero-padding', () => {
      const d = new Date(2026, 4, 3) // May 3, 2026
      expect(localDate(d)).toBe('2026-05-03')
    })
  })

  describe('progressStats', () => {
    it('computes stages, active vocabulary, and daily activities', () => {
      const s1 = newWordState(decision, now)
      s1.skills.recognition = makeCard(7, 7, State.Review)
      s1.skills.recall = makeCard(7, 7, State.Review)
      s1.skills.production = makeCard(5, 5, State.Review) // production_ready

      const s2 = newWordState({ ...decision, id: 'en:decide' }, now)
      // introduced

      const todayStr = localDate(now)
      const yesterday = new Date(now.getTime() - 86_400_000)
      const yesterdayStr = localDate(yesterday)

      const events: ReviewEvent[] = [
        {
          id: 'e1',
          entryId: decision.id,
          language: 'en',
          skill: 'recall',
          exerciseType: 'typed_translation',
          direction: 'native_to_target',
          verdict: 'correct',
          correct: true,
          rating: 3,
          responseMs: 1500,
          hintsUsed: 0,
          retrievabilityBefore: 0.9,
          stabilityAfter: 5,
          scheduledDays: 5,
          timestamp: yesterday,
          mode: 'normal',
        },
        {
          id: 'e2',
          entryId: decision.id,
          language: 'en',
          skill: 'recognition',
          exerciseType: 'mc_meaning',
          direction: 'target_to_native',
          verdict: 'correct',
          correct: true,
          rating: 3,
          responseMs: 1200,
          hintsUsed: 0,
          retrievabilityBefore: 0.9,
          stabilityAfter: 5,
          scheduledDays: 5,
          timestamp: now,
          mode: 'normal',
        },
        {
          id: 'e3-practice',
          entryId: decision.id,
          language: 'en',
          skill: 'recognition',
          exerciseType: 'mc_meaning',
          direction: 'target_to_native',
          verdict: 'correct',
          correct: true,
          rating: 3,
          responseMs: 1000,
          hintsUsed: 0,
          retrievabilityBefore: 0.9,
          stabilityAfter: 5,
          scheduledDays: 5,
          timestamp: now,
          mode: 'practice', // should be excluded from stats
        },
      ]

      const stats = progressStats({
        vocabularyCount: 100,
        states: [s1, s2],
        events,
        scheduler,
        now,
        days: 7,
      })

      expect(stats.stageCounts.production_ready).toBe(1)
      expect(stats.stageCounts.introduced).toBe(1)
      expect(stats.notStarted).toBe(98)
      expect(stats.activeVocabulary).toBe(1)
      expect(stats.daysPractised).toBe(2)
      expect(stats.activity.length).toBe(7)

      const todayAct = stats.activity.find((a) => a.date === todayStr)
      expect(todayAct?.answers).toBe(1)
      expect(todayAct?.correct).toBe(1)

      const yestAct = stats.activity.find((a) => a.date === yesterdayStr)
      expect(yestAct?.answers).toBe(1)
      expect(yestAct?.correct).toBe(1)
    })
  })

  describe('studyStreak', () => {
    it('returns 0 when there are no events', () => {
      expect(studyStreak([], now)).toBe(0)
    })

    it('counts today if user studied today', () => {
      const events = [{ timestamp: now, mode: 'normal' as const }]
      expect(studyStreak(events, now)).toBe(1)
    })

    it('counts yesterday if user has not yet studied today (streak preserved)', () => {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 14, 0)
      const events = [{ timestamp: yesterday, mode: 'normal' as const }]
      expect(studyStreak(events, now)).toBe(1)
    })

    it('returns 0 if user neither studied today nor yesterday', () => {
      const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 14, 0)
      const events = [{ timestamp: twoDaysAgo, mode: 'normal' as const }]
      expect(studyStreak(events, now)).toBe(0)
    })

    it('accumulates consecutive days correctly', () => {
      const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0)
      const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 0)
      const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 10, 0)

      const events = [
        { timestamp: d0, mode: 'normal' as const },
        { timestamp: d1, mode: 'normal' as const },
        { timestamp: d2, mode: 'normal' as const },
      ]
      expect(studyStreak(events, now)).toBe(3)
    })

    it('ignores practice mode events for streaks', () => {
      const events = [{ timestamp: now, mode: 'practice' as const }]
      expect(studyStreak(events, now)).toBe(0)
    })
  })

  describe('answeredToday', () => {
    it('counts only normal mode events that occurred today', () => {
      const yesterday = new Date(now.getTime() - 86_400_000)
      const events = [
        { timestamp: yesterday, mode: 'normal' as const },
        { timestamp: now, mode: 'normal' as const },
        { timestamp: now, mode: 'normal' as const },
        { timestamp: now, mode: 'practice' as const },
      ]
      expect(answeredToday(events, now)).toBe(2)
    })
  })
})
