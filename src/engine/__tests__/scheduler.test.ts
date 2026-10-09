import { describe, expect, it } from 'vitest'
import { Rating, State } from 'ts-fsrs'
import { createScheduler, relativeWorkload } from '../scheduler'
import type { Workload } from '../workload'

describe('scheduler engine', () => {
  const now = new Date('2026-10-10T12:00:00Z')

  describe('relativeWorkload', () => {
    it('returns exactly 1.0 at default 0.9 retention', () => {
      const load = relativeWorkload(0.9)
      expect(load).toBeCloseTo(1.0, 5)
    })

    it('predicts higher workload for higher retention target', () => {
      const high = relativeWorkload(0.95)
      expect(high).toBeGreaterThan(2.0)
    })

    it('predicts lower workload for lower retention target', () => {
      const low = relativeWorkload(0.85)
      expect(low).toBeLessThan(0.7)
    })
  })

  describe('createScheduler', () => {
    it('creates an empty new card with 0 reps', () => {
      const scheduler = createScheduler({ fuzz: false })
      const card = scheduler.newCard(now)
      expect(card.reps).toBe(0)
      expect(card.state).toBe(State.New)
      expect(card.due).toEqual(now)
    })

    it('advances card state and increments reps on review', () => {
      const scheduler = createScheduler({ fuzz: false })
      const card = scheduler.newCard(now)
      const reviewed = scheduler.review(card, Rating.Good, now)

      expect(reviewed.reps).toBe(1)
      expect(reviewed.state).not.toBe(State.New)
      expect(reviewed.due.getTime()).toBeGreaterThan(now.getTime())
    })

    it('returns 0 retrievability for cards with 0 reps', () => {
      const scheduler = createScheduler({ fuzz: false })
      const card = scheduler.newCard(now)
      expect(scheduler.retrievability(card, now)).toBe(0)
    })

    it('computes retrievability for reviewed cards', () => {
      const scheduler = createScheduler({ requestRetention: 0.9, fuzz: false })
      const card = scheduler.newCard(now)
      const reviewed = scheduler.review(card, Rating.Good, now)

      // Retrievability right after review is high
      const rNow = scheduler.retrievability(reviewed, now)
      expect(rNow).toBeGreaterThan(0.9)

      // Retrievability in future (e.g. 30 days after due date) drops noticeably
      const farFuture = new Date(reviewed.due.getTime() + 30 * 86_400_000)
      const rFar = scheduler.retrievability(reviewed, farFuture)
      expect(rFar).toBeLessThan(rNow)
    })

    describe('plain scheduler', () => {
      it('returns itself when no balance option is configured', () => {
        const scheduler = createScheduler({ fuzz: false })
        expect(scheduler.plain?.()).toBe(scheduler)
      })

      it('returns plain scheduler without balance options when balance is configured', () => {
        const load = new Map<string, number>()
        const workload: Workload = {
          dayWeights: [1, 1, 1, 1, 1, 1, 1],
          vacation: null,
        }
        const scheduler = createScheduler({
          fuzz: false,
          balance: { load, workload },
        })

        const plain = scheduler.plain?.()
        expect(plain).toBeDefined()
        expect(plain).not.toBe(scheduler)
        expect(plain?.plain?.()).toBe(plain)
      })
    })

    describe('load balancing on review', () => {
      it('updates load map when reviewing a card with balance', () => {
        const load = new Map<string, number>()
        const workload: Workload = {
          dayWeights: [1, 1, 1, 1, 1, 1, 1],
          vacation: null,
        }
        const scheduler = createScheduler({
          fuzz: false,
          balance: { load, workload },
        })

        const card = scheduler.newCard(now)
        const first = scheduler.review(card, Rating.Good, now)
        expect(first.reps).toBe(1)

        // Review again from the due date
        const second = scheduler.review(first, Rating.Good, first.due)
        expect(second.reps).toBe(2)
        expect(load.size).toBeGreaterThan(0)
      })
    })
  })
})
