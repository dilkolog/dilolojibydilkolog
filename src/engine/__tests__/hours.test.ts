import { describe, expect, it } from 'vitest'
import { hourAdvice, hourBuckets } from '../hours'
import type { ReviewEvent } from '../types'

const now = new Date(2026, 9, 3, 12)
const answers = (hour: number, n: number, right: number): ReviewEvent[] =>
  Array.from({ length: n }, (_, i) => ({ timestamp: new Date(2026, 9, 1, hour, i % 60), verdict: i < right ? 'correct' : 'wrong', mode: 'normal', responseMs: 2000 + i }) as ReviewEvent)

describe('best time of day', () => {
  it('groups answers by time of day and advises a reminder in the best daytime slot', () => {
    const b = hourBuckets([...answers(8, 40, 37), ...answers(22, 50, 36), ...answers(14, 10, 10)], now)
    const morning = b.find((x) => x.from === 6)!
    expect(morning).toMatchObject({ total: 40, correct: 37 })
    expect(b.find((x) => x.from === 21)!.accuracy).toBeCloseTo(0.72)
    const a = hourAdvice(b)!
    // 14:00 has only 10 answers: not enough to count.
    expect(a.best.from).toBe(6)
    expect(a.worst.from).toBe(21)
    expect(a.reminder).toBe('07:00')
  })

  it('gives no advice without enough data or a real difference', () => {
    expect(hourAdvice(hourBuckets(answers(8, 40, 37), now))).toBeNull()
    expect(hourAdvice(hourBuckets([...answers(8, 40, 36), ...answers(20, 40, 36)], now))).toBeNull()
  })
})
