import { describe, expect, it } from 'vitest'
import { memoryCurve } from '../memoryCurve'
import type { ReviewEvent } from '../types'

const day = (d: number) => new Date(Date.UTC(2026, 8, 1 + d, 9))
const ev = (d: number, stabilityAfter: number, verdict: 'correct' | 'wrong' = 'correct', skill: ReviewEvent['skill'] = 'recognition') =>
  ({ id: `${d}${skill}`, entryId: 'x', skill, timestamp: day(d), stabilityAfter, verdict, mode: 'normal' }) as ReviewEvent

describe('forgetting curve', () => {
  it('starts at full recall after each review, decays, and decays slower with higher stability', () => {
    const c = memoryCurve([ev(0, 1), ev(2, 5), ev(9, 20, 'wrong'), ev(10, 2, 'correct', 'recall')], day(12))!
    expect(c.skill).toBe('recognition')
    expect(c.reviews.map((r) => r.correct)).toEqual([true, true, false])
    expect(c.reviews[0].r).toBe(0)
    // Two days on a 1-day stability: well below 90 %.
    expect(c.reviews[1].r).toBeLessThan(0.85)
    // A week on a 5-day stability: higher than two days on 1-day would suggest.
    expect(c.reviews[2].r).toBeGreaterThan(0.8)
    for (let i = 1; i < c.points.length; i++) {
      const sameSegment = !c.reviews.some((r) => r.t >= c.points[i - 1].t && r.t <= c.points[i].t)
      if (sameSegment) expect(c.points[i].r).toBeLessThanOrEqual(c.points[i - 1].r + 1e-9)
    }
    expect(c.points.at(-1)!.t).toBe(day(12).getTime() + 30 * 86_400_000)
  })

  it('needs practice answers excluded and at least one answer', () => {
    expect(memoryCurve([], day(1))).toBeNull()
    expect(memoryCurve([{ ...ev(0, 1), mode: 'practice' }], day(1))).toBeNull()
  })
})
