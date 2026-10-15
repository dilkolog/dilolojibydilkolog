import { describe, expect, it } from 'vitest'
import { afterCheck, dueLesson, putOff, reviewDay } from './guideReview'

describe('guide review', () => {
  it('brings a read lesson back after 3 days, a learned one after 3, 10 and 30, then never', () => {
    expect(reviewDay(undefined)).toBeNull()
    expect(reviewDay({ read: '2026-10-01' })).toBe('2026-10-04')
    let mark = afterCheck({ read: '2026-10-01' }, true, '2026-10-02')
    expect(mark).toMatchObject({ learned: '2026-10-02', step: 0 })
    expect(reviewDay(mark)).toBe('2026-10-05')
    mark = afterCheck(mark, true, '2026-10-05')
    expect(reviewDay(mark)).toBe('2026-10-15')
    mark = afterCheck(mark, true, '2026-10-15')
    expect(reviewDay(mark)).toBe('2026-11-14')
    mark = afterCheck(mark, true, '2026-11-14')
    expect(reviewDay(mark)).toBeNull()
  })

  it('a failed check starts the steps over; putting off waits again from today', () => {
    const learned = { read: '2026-10-01', learned: '2026-10-01', reviewed: '2026-10-11', step: 2 }
    const failed = afterCheck(learned, false, '2026-11-10')
    expect(failed).toMatchObject({ learned: '2026-10-01', step: 0, reviewed: '2026-11-10' })
    expect(reviewDay(failed)).toBe('2026-11-13')
    expect(reviewDay(putOff(failed, '2026-11-13'))).toBe('2026-11-16')
  })

  it('picks the lesson waiting longest, only among the checkable ones', () => {
    const marks = { a: { read: '2026-10-01' }, b: { read: '2026-09-20' }, c: { read: '2026-09-01' }, d: { read: '2026-10-14' } }
    expect(dueLesson(marks, ['a', 'b', 'd'], '2026-10-15')).toBe('b')
    expect(dueLesson(marks, ['d'], '2026-10-15')).toBeNull()
    expect(dueLesson({}, ['a'], '2026-10-15')).toBeNull()
  })
})
