import { describe, expect, it } from 'vitest'
import { State } from 'ts-fsrs'
import type { UserWordState, VocabularyEntry } from '../engine/types'
import { goalForecast, knownTotal, milestone, weeklyGrowth, type KnownLog } from './knownMilestones'

describe('knownMilestones', () => {
  const sampleEntry: VocabularyEntry = {
    id: 'fr:maison',
    language: 'fr',
    lemma: 'maison',
    partOfSpeech: 'noun',
    cefr: 'A1',
    frequencyRank: 100,
    register: 'neutral',
    collocations: [],
    relations: [],
    wordFamily: [],
    tags: [],
    source: 'sample',
    senses: [{ id: '1', gloss: 'ev', examples: [] }],
  }

  const sampleState: UserWordState = {
    entryId: 'fr:maison',
    language: 'fr',
    introducedAt: new Date('2026-10-01T00:00:00Z'),
    stats: { reviews: 10, correct: 9, wrong: 1, hints: 0, totalResponseMs: 5000, consecutiveWrong: 0 },
    skills: {
      recognition: {
        state: State.Review,
        due: new Date('2026-10-20'),
        stability: 10,
        difficulty: 3,
        elapsed_days: 5,
        scheduled_days: 10,
        reps: 5,
        lapses: 0,
        learning_steps: 0,
        last_review: new Date('2026-10-10'),
      },
    },
  }

  describe('knownTotal', () => {
    it('combines words manually marked known with graduated flashcards', () => {
      const knownSet = new Set(['chat', 'chien'])
      const total = knownTotal(knownSet, [sampleEntry], [sampleState], 'fr')
      // 'maison' is in Review state and matches language 'fr', so it is added
      expect(total).toBe(3)
    })

    it('does not count duplicate entries or other languages', () => {
      const knownSet = new Set(['maison'])
      const total = knownTotal(knownSet, [sampleEntry], [sampleState], 'fr')
      // 'maison' is already in knownSet, so set size remains 1
      expect(total).toBe(1)

      const esTotal = knownTotal(knownSet, [sampleEntry], [sampleState], 'es')
      // sampleEntry is 'fr', not 'es'
      expect(esTotal).toBe(1)
    })
  })

  describe('milestone', () => {
    it('returns 0 to 500 for total under 500', () => {
      expect(milestone(0)).toEqual({ from: 0, to: 500 })
      expect(milestone(250)).toEqual({ from: 0, to: 500 })
    })

    it('returns consecutive brackets for intermediate numbers', () => {
      expect(milestone(500)).toEqual({ from: 500, to: 1000 })
      expect(milestone(1500)).toEqual({ from: 1000, to: 2000 })
      expect(milestone(4999)).toEqual({ from: 3000, to: 5000 })
      expect(milestone(10000)).toEqual({ from: 10000, to: 12500 })
    })

    it('handles counts beyond 50,000 gracefully', () => {
      const high = milestone(55000)
      expect(high.to).toBe(60000)
      expect(high.from).toBe(50000)
    })
  })

  describe('weeklyGrowth', () => {
    const now = new Date('2026-10-15T12:00:00Z')

    it('returns null if there is no log snapshot from a week or more ago', () => {
      const log: KnownLog = [{ day: '2026-10-12', total: 400 }]
      expect(weeklyGrowth(log, 450, now)).toBeNull()
    })

    it('calculates the growth compared to the snapshot from a week ago', () => {
      const log: KnownLog = [
        { day: '2026-10-01', total: 300 },
        { day: '2026-10-08', total: 400 },
        { day: '2026-10-12', total: 450 },
      ]
      // 7 days ago was 2026-10-08, total was 400
      expect(weeklyGrowth(log, 470, now)).toBe(70)
    })
  })

  describe('goalForecast', () => {
    const now = new Date('2026-10-15T12:00:00Z')

    it('returns onTrack when goal is already reached', () => {
      const forecast = goalForecast([], 1000, { target: 1000, by: '2026-10-30' }, now)
      expect(forecast.onTrack).toBe(true)
      expect(forecast.needed).toBe(0)
    })

    it('calculates pace and needed words per day', () => {
      const log: KnownLog = [
        { day: '2026-10-01', total: 500 },
        { day: '2026-10-08', total: 570 },
      ]
      // Current total: 640 on 2026-10-15 (14 days after 2026-10-01, 140 words gained -> ~10/day)
      const forecast = goalForecast(log, 640, { target: 790, by: '2026-10-30' }, now)
      expect(forecast.pace).toBeCloseTo(10, 0)
      expect(forecast.daysLeft).toBe(16)
      expect(forecast.needed).toBe(10)
      expect(forecast.onTrack).toBe(true)
      expect(forecast.eta).toBeDefined()
    })
  })
})
