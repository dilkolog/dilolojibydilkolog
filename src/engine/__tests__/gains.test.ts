import { State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { studyGains } from '../gains'
import type { ReviewEvent, UserWordState } from '../types'

const NOW = new Date('2026-10-10T09:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)
const state = (id: string, recall?: { state: State; stability: number }, language: 'fr' | 'es' = 'fr') =>
  ({ entryId: id, language, skills: recall ? { recall } : {} }) as unknown as UserWordState
const event = (id: string, at: Date, over: Partial<ReviewEvent> = {}) =>
  ({ entryId: id, language: 'fr', skill: 'recall', mode: 'normal', verdict: 'correct', retrievabilityBefore: 0.9, stabilityAfter: 3, timestamp: at, ...over }) as ReviewEvent

describe('what studying bought', () => {
  it('counts words recalled reliably, and the ones that got there this week', () => {
    const states = [
      state('fr:a', { state: State.Review, stability: 12 }),
      state('fr:b', { state: State.Review, stability: 9 }),
      state('fr:c', { state: State.Review, stability: 3 }),
      state('fr:d', { state: State.Learning, stability: 10 }),
      state('es:e', { state: State.Review, stability: 20 }, 'es'),
      state('fr:f'),
    ]
    const events = [event('fr:a', daysAgo(20), { stabilityAfter: 8 }), event('fr:a', daysAgo(2), { stabilityAfter: 12 }), event('fr:b', daysAgo(3), { stabilityAfter: 9 })]
    expect(studyGains(states, events, 'fr', NOW)).toMatchObject({ recallable: 2, newThisWeek: 1 })
  })

  it('gives the recall rate of real reviews this week, once there are enough of them', () => {
    const reviews = Array.from({ length: 20 }, (_, i) => event(`fr:${i}`, daysAgo(1), { verdict: i < 17 ? 'correct' : 'wrong', skill: 'recognition' }))
    // A first meeting (nothing to forget yet) and last month's answers don't count.
    const noise = [event('fr:x', daysAgo(1), { retrievabilityBefore: 0, verdict: 'wrong' }), event('fr:y', daysAgo(10), { verdict: 'wrong' })]
    expect(studyGains([], [...reviews, ...noise], 'fr', NOW).recallRate).toBeCloseTo(0.85)
    expect(studyGains([], reviews.slice(0, 5), 'fr', NOW).recallRate).toBeNull()
  })
})
