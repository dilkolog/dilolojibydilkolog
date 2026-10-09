import { describe, expect, it } from 'vitest'
import { State } from 'ts-fsrs'
import { createScheduler } from '../scheduler'
import {
  holdUntilRecalled,
  markKnown,
  needsIntervention,
  newWordState,
  nextReviewAt,
  processAttempt,
  recallProven,
  type AttemptInput,
} from '../review'
import { decision } from './fixtures'
import type { Mistake, UserWordState } from '../types'

describe('review engine', () => {
  const scheduler = createScheduler({ fuzz: false })
  const now = new Date('2026-10-10T12:00:00Z')

  describe('newWordState', () => {
    it('creates fresh word state with clean stats and empty skills', () => {
      const state = newWordState(decision, now)
      expect(state.entryId).toBe(decision.id)
      expect(state.language).toBe(decision.language)
      expect(state.introducedAt).toBe(now)
      expect(state.skills).toEqual({})
      expect(state.stats).toEqual({
        reviews: 0,
        correct: 0,
        wrong: 0,
        hints: 0,
        totalResponseMs: 0,
        consecutiveWrong: 0,
      })
    })
  })

  describe('recallProven', () => {
    it('returns false when recall skill does not exist or has 0 reps', () => {
      const state = newWordState(decision, now)
      expect(recallProven(state)).toBe(false)

      state.skills.recall = { ...scheduler.newCard(now), reps: 0, stability: 2 }
      expect(recallProven(state)).toBe(false)
    })

    it('returns false when stability is below 1 day (lapsed)', () => {
      const state = newWordState(decision, now)
      state.skills.recall = { ...scheduler.newCard(now), reps: 3, stability: 0.5 }
      expect(recallProven(state)).toBe(false)
    })

    it('returns true when recall has held with reps > 0 and stability >= 1', () => {
      const state = newWordState(decision, now)
      state.skills.recall = { ...scheduler.newCard(now), reps: 1, stability: 1.2 }
      expect(recallProven(state)).toBe(true)
    })
  })

  describe('holdUntilRecalled', () => {
    it('does not cap interval for non-choice exercises', () => {
      const state = newWordState(decision, now)
      const card = { ...scheduler.newCard(now), due: new Date(now.getTime() + 7 * 86_400_000), scheduled_days: 7 }
      // typed_translation is a typed recall exercise
      const held = holdUntilRecalled(card, state, { exerciseType: 'typed_translation' }, now)
      expect(held.scheduled_days).toBe(7)
      expect(held.due).toEqual(card.due)
    })

    it('caps choice exercise due date to 1 day if recall is not proven', () => {
      const state = newWordState(decision, now)
      const farDue = new Date(now.getTime() + 5 * 86_400_000)
      const card = { ...scheduler.newCard(now), due: farDue, scheduled_days: 5 }
      // mc_meaning is choice
      const held = holdUntilRecalled(card, state, { exerciseType: 'mc_meaning' }, now)
      expect(held.scheduled_days).toBe(1)
      expect(held.due.getTime()).toBe(now.getTime() + 86_400_000)
    })

    it('does not cap choice exercise due date if recall is already proven', () => {
      const state = newWordState(decision, now)
      state.skills.recall = { ...scheduler.newCard(now), reps: 2, stability: 3 }
      const farDue = new Date(now.getTime() + 5 * 86_400_000)
      const card = { ...scheduler.newCard(now), due: farDue, scheduled_days: 5 }
      const held = holdUntilRecalled(card, state, { exerciseType: 'mc_meaning' }, now)
      expect(held.scheduled_days).toBe(5)
      expect(held.due).toEqual(farDue)
    })
  })

  describe('processAttempt', () => {
    it('updates stats and schedules card on correct answer in normal mode', () => {
      const state = newWordState(decision, now)
      const input: AttemptInput = {
        exerciseType: 'mc_meaning',
        verdict: 'correct',
        responseMs: 1200,
        hintsUsed: 0,
        maxHints: 0,
        at: now,
        mode: 'normal',
      }
      const mistakes: Mistake[] = []
      const result = processAttempt(state, input, mistakes, scheduler, () => 'evt-1')

      expect(result.state.stats.reviews).toBe(1)
      expect(result.state.stats.correct).toBe(1)
      expect(result.state.stats.wrong).toBe(0)
      expect(result.state.stats.consecutiveWrong).toBe(0)
      expect(result.state.stats.totalResponseMs).toBe(1200)
      expect(result.state.skills.recognition).toBeDefined()
      expect(result.event.id).toBe('evt-1')
      expect(result.event.correct).toBe(true)
      expect(result.event.verdict).toBe('correct')
    })

    it('records mistake and resets retired status on wrong answer in normal mode', () => {
      const state: UserWordState = {
        ...newWordState(decision, now),
        retired: true,
      }
      const input: AttemptInput = {
        exerciseType: 'typed_translation',
        verdict: 'wrong',
        errorType: 'meaning',
        given: 'wrong word',
        expected: 'decision',
        responseMs: 3000,
        hintsUsed: 1,
        maxHints: 2,
        at: now,
        mode: 'normal',
      }
      const mistakes: Mistake[] = []
      const result = processAttempt(state, input, mistakes, scheduler)

      expect(result.state.stats.reviews).toBe(1)
      expect(result.state.stats.wrong).toBe(1)
      expect(result.state.stats.consecutiveWrong).toBe(1)
      expect(result.state.retired).toBeUndefined() // unretired!
      expect(result.mistakes.length).toBe(1)
      expect(result.mistakes[0].entryId).toBe(decision.id)
      expect(result.mistakes[0].errorType).toBe('meaning')
    })

    it('does not touch cards, stats, or mistakes in practice mode', () => {
      const state = newWordState(decision, now)
      const input: AttemptInput = {
        exerciseType: 'mc_meaning',
        verdict: 'wrong',
        errorType: 'meaning',
        responseMs: 2000,
        hintsUsed: 0,
        maxHints: 0,
        at: now,
        mode: 'practice',
      }
      const mistakes: Mistake[] = []
      const result = processAttempt(state, input, mistakes, scheduler)

      expect(result.state.stats.reviews).toBe(0)
      expect(result.state.stats.wrong).toBe(0)
      expect(result.state.skills).toEqual({})
      expect(result.state.lastExerciseType).toBe('mc_meaning')
      expect(result.mistakes).toEqual([])
      expect(result.event.mode).toBe('practice')
    })
  })

  describe('nextReviewAt', () => {
    it('returns undefined if no skills are recorded', () => {
      const state = newWordState(decision, now)
      expect(nextReviewAt(state)).toBeUndefined()
    })

    it('returns earliest due date across skills', () => {
      const state = newWordState(decision, now)
      const due1 = new Date('2026-10-15T10:00:00Z')
      const due2 = new Date('2026-10-12T10:00:00Z')
      state.skills.recognition = { ...scheduler.newCard(now), due: due1 }
      state.skills.recall = { ...scheduler.newCard(now), due: due2 }

      expect(nextReviewAt(state)).toEqual(due2)
    })
  })

  describe('needsIntervention', () => {
    it('flags intervention when consecutiveWrong is >= 3', () => {
      const state = newWordState(decision, now)
      expect(needsIntervention(state)).toBe(false)
      state.stats.consecutiveWrong = 2
      expect(needsIntervention(state)).toBe(false)
      state.stats.consecutiveWrong = 3
      expect(needsIntervention(state)).toBe(true)
      state.stats.consecutiveWrong = 5
      expect(needsIntervention(state)).toBe(true)
    })
  })

  describe('markKnown', () => {
    it('sets both recognition and recall to Easy with long interval', () => {
      const state = newWordState(decision, now)
      const known = markKnown(state, scheduler, now)

      expect(known.skills.recognition).toBeDefined()
      expect(known.skills.recall).toBeDefined()
      expect(known.skills.recognition!.state).toBe(State.Review)
      expect(known.skills.recall!.state).toBe(State.Review)
      expect(known.skills.recognition!.scheduled_days).toBeGreaterThan(1)
      expect(known.skills.recall!.scheduled_days).toBeGreaterThan(1)
      expect(known.lastReviewAt).toEqual(now)
    })
  })
})
