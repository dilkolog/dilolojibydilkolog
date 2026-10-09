import { describe, expect, it } from 'vitest'
import { State, type Card } from 'ts-fsrs'
import { createScheduler } from '../scheduler'
import {
  MASTERY_STAGES,
  MASTERED_STABILITY_DAYS,
  PRODUCTION_READY_STABILITY_DAYS,
  STRONG_STABILITY_DAYS,
  masteryStage,
  skillProfile,
  skillScores,
} from '../mastery'
import { decision } from './fixtures'
import { newWordState } from '../review'

describe('mastery engine', () => {
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

  describe('MASTERY_STAGES', () => {
    it('defines ordered progression from introduced to mastered', () => {
      expect(MASTERY_STAGES).toEqual([
        'introduced',
        'familiar',
        'recallable',
        'strong',
        'production_ready',
        'mastered',
      ])
    })
  })

  describe('masteryStage', () => {
    it('returns introduced for fresh word without review cards', () => {
      const state = newWordState(decision, now)
      expect(masteryStage(state)).toBe('introduced')

      // Learning state does not graduate
      state.skills.recognition = makeCard(1, 0.5, State.Learning)
      expect(masteryStage(state)).toBe('introduced')
    })

    it('returns familiar when recognition is graduated into Review state', () => {
      const state = newWordState(decision, now)
      state.skills.recognition = makeCard(1, 1, State.Review)
      expect(masteryStage(state)).toBe('familiar')
    })

    it('returns recallable when recall is graduated into Review state', () => {
      const state = newWordState(decision, now)
      state.skills.recognition = makeCard(1, 1, State.Review)
      state.skills.recall = makeCard(1, 1, State.Review)
      expect(masteryStage(state)).toBe('recallable')
    })

    it('returns strong when both recognition and recall reach STRONG_STABILITY_DAYS (7d)', () => {
      const state = newWordState(decision, now)
      state.skills.recognition = makeCard(7, STRONG_STABILITY_DAYS, State.Review)
      state.skills.recall = makeCard(7, STRONG_STABILITY_DAYS, State.Review)
      expect(masteryStage(state)).toBe('strong')
    })

    it('returns production_ready when recall >= 7d and production >= 3d', () => {
      const state = newWordState(decision, now)
      state.skills.recognition = makeCard(7, STRONG_STABILITY_DAYS, State.Review)
      state.skills.recall = makeCard(7, STRONG_STABILITY_DAYS, State.Review)
      state.skills.production = makeCard(3, PRODUCTION_READY_STABILITY_DAYS, State.Review)
      expect(masteryStage(state)).toBe('production_ready')
    })

    it('returns mastered when recognition, recall, and production all reach 21d stability', () => {
      const state = newWordState(decision, now)
      state.skills.recognition = makeCard(21, MASTERED_STABILITY_DAYS, State.Review)
      state.skills.recall = makeCard(21, MASTERED_STABILITY_DAYS, State.Review)
      state.skills.production = makeCard(21, MASTERED_STABILITY_DAYS, State.Review)
      expect(masteryStage(state)).toBe('mastered')
    })
  })

  describe('skillScores', () => {
    it('scores 0 for untouched skills and 0-100 for practiced skills', () => {
      const state = newWordState(decision, now)
      state.skills.recognition = makeCard(1, 5, State.Review)

      const scores = skillScores(state, scheduler, now)
      expect(scores.recognition).toBeGreaterThan(0)
      expect(scores.recall).toBe(0)
      expect(scores.listening).toBe(0)
      expect(scores.gender).toBe(0)
    })
  })

  describe('skillProfile', () => {
    it('returns null for skills that have never been practiced across words', () => {
      const s1 = newWordState(decision, now)
      const s2 = newWordState(decision, now)
      s1.skills.recognition = makeCard(1, 5, State.Review)

      const profile = skillProfile([s1, s2], scheduler, now)
      expect(profile.recognition).toBeGreaterThan(0)
      expect(profile.recall).toBeNull()
      expect(profile.listening).toBeNull()
    })

    it('averages retrievability across words where the skill is unlocked', () => {
      const s1 = newWordState(decision, now)
      const s2 = newWordState(decision, now)
      s1.skills.recognition = makeCard(1, 10, State.Review)
      s2.skills.recognition = makeCard(1, 10, State.Review)

      const profile = skillProfile([s1, s2], scheduler, now)
      expect(profile.recognition).toBeGreaterThan(80)
    })
  })
})
