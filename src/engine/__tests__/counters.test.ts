import { describe, expect, it } from 'vitest'
import { eventCounters, raiseCounters } from '../counters'
import type { ReviewEvent, UserWordState } from '../types'

const ev = (id: string, at: string, verdict: 'correct' | 'wrong', over: Partial<ReviewEvent> = {}) =>
  ({ id: `${id}${at}`, entryId: id, verdict, mode: 'normal', timestamp: new Date(at), hintsUsed: 0, responseMs: 1000, ...over }) as ReviewEvent
const st = (entryId: string, stats: Partial<UserWordState['stats']>) =>
  ({ entryId, stats: { reviews: 0, correct: 0, wrong: 0, hints: 0, totalResponseMs: 0, consecutiveWrong: 0, ...stats } }) as UserWordState

describe('counters after a sync', () => {
  it('count the answers that move the schedule, with the latest run of wrong ones', () => {
    const c = eventCounters([ev('a', '2026-10-01', 'wrong'), ev('a', '2026-10-02', 'correct', { hintsUsed: 1 }), ev('a', '2026-10-03', 'wrong'), ev('a', '2026-10-04', 'wrong'), ev('a', '2026-10-05', 'correct', { mode: 'practice' })]).get('a')!
    expect(c).toEqual({ reviews: 4, correct: 1, wrong: 3, hints: 1, totalResponseMs: 4000, consecutiveWrong: 2 })
  })

  it('add up what two devices answered apart (the state merge alone kept only the larger count)', () => {
    // Both devices had 2 answers, then the phone answered twice more and the laptop three times: merged state says 5, answers say 7.
    const events = ['01', '02', '03', '04', '05', '06', '07'].map((d, i) => ev('a', `2026-10-${d}`, i === 6 ? 'wrong' : 'correct'))
    const [s] = raiseCounters([st('a', { reviews: 5, correct: 5 })], events)
    expect(s.stats).toMatchObject({ reviews: 7, correct: 6, wrong: 1, consecutiveWrong: 1 })
  })

  it('never lowers a count, so one from before the answers were kept stays', () => {
    const old = st('a', { reviews: 40, correct: 30, wrong: 10 })
    expect(raiseCounters([old], [ev('a', '2026-10-01', 'correct')])[0]).toBe(old)
  })
})
