import { describe, expect, it } from 'vitest'
import { State } from 'ts-fsrs'
import { createScheduler } from '../scheduler'
import { createRng } from '../rng'
import {
  dueSkills,
  ERROR_SKILL,
  pickExerciseType,
  startOfDay,
  unlockedSkills,
} from '../selection'
import { decision } from './fixtures'
import { newWordState } from '../review'
import type { VocabularyEntry } from '../types'

describe('selection engine', () => {
  const scheduler = createScheduler({ fuzz: false })
  const now = new Date('2026-10-10T12:00:00Z')

  describe('startOfDay', () => {
    it('zeroes out hours, minutes, seconds and ms', () => {
      const d = new Date('2026-10-10T15:45:32.123Z')
      const sod = startOfDay(d)
      expect(sod.getHours()).toBe(0)
      expect(sod.getMinutes()).toBe(0)
      expect(sod.getSeconds()).toBe(0)
      expect(sod.getMilliseconds()).toBe(0)
    })
  })

  describe('unlockedSkills', () => {
    it('returns only recognition for unintroduced or fresh word', () => {
      expect(unlockedSkills(undefined, decision)).toEqual(['recognition'])

      const state = newWordState(decision, now)
      expect(unlockedSkills(state, decision)).toEqual(['recognition'])
    })

    it('unlocks recall once recognition has at least 1 rep', () => {
      const state = newWordState(decision, now)
      state.skills.recognition = { ...scheduler.newCard(now), reps: 1 }
      expect(unlockedSkills(state, decision)).toEqual(['recognition', 'recall'])
    })

    it('unlocks gender on FR/ES noun once recall has held (stability >= 1)', () => {
      const frNoun: VocabularyEntry = {
        ...decision,
        id: 'fr:pomme',
        language: 'fr',
        lemma: 'pomme',
        partOfSpeech: 'noun',
        gender: 'f',
        article: 'la',
      }
      const state = newWordState(frNoun, now)
      state.skills.recognition = { ...scheduler.newCard(now), reps: 2 }
      state.skills.recall = { ...scheduler.newCard(now), reps: 1, stability: 1.5 }

      const skills = unlockedSkills(state, frNoun)
      expect(skills).toContain('gender')
    })

    it('unlocks listening, collocation, and production once recall reaches Review state', () => {
      const state = newWordState(decision, now)
      state.skills.recognition = { ...scheduler.newCard(now), reps: 2 }
      state.skills.recall = {
        ...scheduler.newCard(now),
        reps: 3,
        stability: 4,
        state: State.Review,
      }

      const skills = unlockedSkills(state, decision)
      expect(skills).toContain('listening')
      expect(skills).toContain('collocation')
      expect(skills).toContain('production')
    })
  })

  describe('dueSkills', () => {
    it('considers unpractised unlocked skill due if word was reviewed before today', () => {
      const state = newWordState(decision, new Date('2026-10-08T10:00:00Z'))
      state.lastReviewAt = new Date('2026-10-08T10:00:00Z')
      state.skills.recognition = { ...scheduler.newCard(now), reps: 1 }

      const due = dueSkills(state, decision, scheduler, now)
      // recall is unlocked and due because last review was 2 days ago
      expect(due.some((d) => d.skill === 'recall')).toBe(true)
    })

    it('does not drill newly unlocked skills on the very same day the word was learned', () => {
      const state = newWordState(decision, now)
      state.lastReviewAt = now // reviewed right now
      state.skills.recognition = { ...scheduler.newCard(now), reps: 1 }

      const due = dueSkills(state, decision, scheduler, now)
      // recall was unlocked today, but lastReviewAt is today, so not due today
      expect(due.some((d) => d.skill === 'recall')).toBe(false)
    })

    it('sorts due skills with lowest retrievability first', () => {
      const state = newWordState(decision, new Date('2026-10-01T10:00:00Z'))
      const pastReview = new Date('2026-10-01T10:00:00Z')
      const pastDue = new Date('2026-10-05T10:00:00Z')
      state.skills.recognition = {
        ...scheduler.newCard(pastReview),
        reps: 2,
        last_review: pastReview,
        due: pastDue,
        stability: 10,
        state: State.Review,
      }
      state.skills.recall = {
        ...scheduler.newCard(pastReview),
        reps: 2,
        last_review: pastReview,
        due: pastDue,
        stability: 1, // lower stability = lower retrievability
        state: State.Review,
      }

      const due = dueSkills(state, decision, scheduler, now)
      expect(due.length).toBeGreaterThan(0)
      const recallDue = due.find((d) => d.skill === 'recall')!
      const recDue = due.find((d) => d.skill === 'recognition')!
      expect(recallDue).toBeDefined()
      expect(recDue).toBeDefined()
      expect(recallDue.retrievability).toBeLessThan(recDue.retrievability)
    })
  })

  describe('ERROR_SKILL map', () => {
    it('maps every mistake type to a valid skill', () => {
      expect(ERROR_SKILL.meaning).toBe('recall')
      expect(ERROR_SKILL.gender).toBe('gender')
      expect(ERROR_SKILL.confusion).toBe('recognition')
      expect(ERROR_SKILL.collocation).toBe('collocation')
      expect(ERROR_SKILL.form).toBe('production')
    })
  })

  describe('pickExerciseType', () => {
    const rng = createRng(42)

    it('picks a valid exercise for the requested skill', () => {
      const type = pickExerciseType('recognition', decision, undefined, rng)
      expect(['mc_meaning', 'mc_context', 'discriminate', 'picture_choice']).toContain(type)
    })

    it('prefers a different exercise than the last seen format if alternatives exist', () => {
      const state = newWordState(decision, now)
      state.lastExerciseType = 'mc_meaning'
      const type = pickExerciseType('recognition', decision, state, rng)
      expect(type).not.toBe('mc_meaning')
    })

    it('prefers mc_context for multiword phrases in recognition', () => {
      const phraseEntry: VocabularyEntry = {
        ...decision,
        id: 'en:make_a_decision',
        lemma: 'make a decision',
        partOfSpeech: 'phrase',
      }
      const type = pickExerciseType('recognition', phraseEntry, undefined, rng)
      expect(type).toBe('mc_context')
    })
  })
})
