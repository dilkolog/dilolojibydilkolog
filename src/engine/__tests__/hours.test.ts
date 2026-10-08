import { describe, expect, it } from 'vitest'
import { hourAdvice, hourBuckets, reminderTime, usualStudyHour } from '../hours'
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

describe('usual study hour', () => {
  // One session per day: its first answer at `hour`, a later one that doesn't count.
  const day = (d: number, hour: number) =>
    [new Date(2026, 9, d, hour, 10), new Date(2026, 9, d, hour + 1, 30)].map((timestamp) => ({ timestamp, mode: 'normal' }) as ReviewEvent)
  const today = new Date(2026, 9, 20, 23)

  it('is the most common hour of the day\'s first answer, ties to the earlier one', () => {
    const events = [day(10, 21), day(11, 21), day(12, 8), day(13, 21), day(14, 8), day(15, 8)].flat()
    expect(usualStudyHour(events, today)).toBe(8)
    expect(usualStudyHour([...events, ...day(16, 21)], today)).toBe(21)
  })

  it('needs five days, ignores night starts and days older than a month', () => {
    expect(usualStudyHour([day(10, 21), day(11, 21), day(12, 21), day(13, 21)].flat(), today)).toBeNull()
    expect(usualStudyHour([day(10, 2), day(11, 2), day(12, 2), day(13, 21), day(14, 9)].flat(), today)).toBe(9)
    const old = [1, 2, 3, 4, 5].flatMap((d) => day(d, 18)).map((e) => ({ ...e, timestamp: new Date(2026, 7, e.timestamp.getDate(), 18) }))
    expect(usualStudyHour(old, today)).toBeNull()
  })

  it('is used unless a fixed time was chosen or it isn\'t known yet', () => {
    expect(reminderTime({ time: '20:00' }, 8)).toBe('08:00')
    expect(reminderTime({ time: '20:00', auto: false }, 8)).toBe('20:00')
    expect(reminderTime({ time: '19:30' }, null)).toBe('19:30')
  })
})
