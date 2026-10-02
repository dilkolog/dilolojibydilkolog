import { describe, expect, it } from 'vitest'
import { errorDigest } from '../errorDigest'
import type { ReviewEvent } from '../types'
import { decision, leave } from './fixtures'

const NOW = new Date('2026-10-02T10:00:00Z')
let n = 0
const ev = (over: Partial<ReviewEvent>): ReviewEvent =>
  ({
    id: String(n++),
    entryId: decision.id,
    language: 'en',
    skill: 'production',
    exerciseType: 'typed_translation',
    direction: 'native_to_target',
    verdict: 'correct',
    correct: true,
    rating: 3,
    responseMs: 3000,
    hintsUsed: 0,
    retrievabilityBefore: 0.9,
    stabilityAfter: 10,
    scheduledDays: 5,
    mode: 'normal',
    timestamp: new Date(NOW.getTime() - 86_400_000),
    ...over,
  }) as ReviewEvent

describe('error digest', () => {
  it('counts error kinds, finds recurring slips and leaves out old answers and practice', () => {
    const events = [
      ev({}),
      ev({ verdict: 'wrong', correct: false, errorType: 'typo', given: 'decission', expected: 'decision' }),
      ev({ verdict: 'wrong', correct: false, errorType: 'typo', given: 'Decission', expected: 'decision' }),
      ev({ verdict: 'wrong', correct: false, errorType: 'meaning', given: 'arrive', expected: 'leave', entryId: leave.id }),
      ev({ verdict: 'wrong', correct: false, errorType: 'typo', given: 'x', timestamp: new Date('2026-08-01') }),
      ev({ verdict: 'wrong', correct: false, errorType: 'typo', given: 'y', mode: 'practice' }),
    ]
    const d = errorDigest(events, [decision, leave], 'en', NOW)
    expect(d.answers).toBe(4)
    expect(d.wrong).toBe(3)
    expect(d.byType).toEqual([
      { type: 'typo', count: 2 },
      { type: 'meaning', count: 1 },
    ])
    expect(d.recurring).toEqual([{ entryId: decision.id, word: 'decision', given: 'decission', expected: 'decision', type: 'typo', count: 2 }])
    expect(d.lines[0]).toBe('decision [typo]: wrote "decission", expected "decision" ×2')
  })
})
