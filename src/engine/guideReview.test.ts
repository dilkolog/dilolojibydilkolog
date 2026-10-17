import { describe, expect, it } from 'vitest'
import { afterCheck, cleanMarks, dueLesson, isRead, mergeMarks, putOff, reviewDay, type GuideMarks } from './guideReview'

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

describe('marks across devices', () => {
  it('keeps per lesson the mark touched last, and the further on when on the same day', () => {
    const a: GuideMarks = { x: { read: '2026-10-01', learned: '2026-10-02', reviewed: '2026-10-05', step: 1 }, y: { read: '2026-10-03' }, same: { read: '2026-10-01', learned: '2026-10-01', step: 0 } }
    const b: GuideMarks = { x: { read: '2026-10-01', learned: '2026-10-02', reviewed: '2026-10-12', step: 2 }, z: { read: '2026-10-04' }, same: { read: '2026-10-01', learned: '2026-10-01', step: 1 } }
    const m = mergeMarks(a, b)
    expect(m.x?.step).toBe(2)
    expect(Object.keys(m).sort()).toEqual(['same', 'x', 'y', 'z'])
    expect(m.same?.step).toBe(1)
    expect(mergeMarks(b, a)).toEqual(m)
  })

  it('an unmarking is newer than the read it undoes, and a later read is newer than it', () => {
    const read: GuideMarks = { x: { read: '2026-10-01' } }
    const off: GuideMarks = { x: { read: '', off: '2026-10-05' } }
    expect(isRead(mergeMarks(read, off).x)).toBe(false)
    const again: GuideMarks = { x: { read: '2026-10-09' } }
    expect(isRead(mergeMarks(off, again).x)).toBe(true)
  })

  it('cleans what storage or a backup brings: bad entries are dropped, steps are bounded', () => {
    const c = cleanMarks({ ok: { read: '2026-10-01', learned: '2026-10-02', step: 99, junk: 1 }, noDate: { read: 'x' }, num: 3, off: { read: '', off: '2026-10-03' }, neg: { read: '2026-10-01', step: -1 } })
    expect(Object.keys(c).sort()).toEqual(['neg', 'off', 'ok'])
    expect(c.ok?.step).toBe(3)
    expect(c.neg?.step).toBeUndefined()
    expect(cleanMarks([1, 2])).toEqual({})
    expect(cleanMarks(null)).toEqual({})
  })
})

describe('lesson flags', () => {
  it('a lesson found hard comes back in half the time', () => {
    const mark = { read: '2026-10-01', learned: '2026-10-02', reviewed: '2026-10-02', step: 1 }
    expect(reviewDay(mark)).toBe('2026-10-12')
    expect(reviewDay({ ...mark, flag: 'hard', flagAt: '2026-10-03' })).toBe('2026-10-07')
    expect(reviewDay({ ...mark, flag: 'star', flagAt: '2026-10-03' })).toBe('2026-10-12')
  })

  it('the flag goes by its own day when two devices meet, and taking it off is carried too', () => {
    const a: GuideMarks = { x: { read: '2026-10-09', learned: '2026-10-09', step: 0, flag: 'star', flagAt: '2026-10-02' } }
    // The other device took the flag off later, and has not touched the lesson since.
    const b: GuideMarks = { x: { read: '2026-10-01', flagAt: '2026-10-05' } }
    const m = mergeMarks(a, b).x!
    expect(m.flag).toBeUndefined()
    expect(m.learned).toBe('2026-10-09')
    // A newer flag on one side wins over an older one on the other, whoever has the later reading.
    const c: GuideMarks = { x: { read: '2026-10-01', flag: 'hard', flagAt: '2026-10-12' } }
    expect(mergeMarks(a, c).x).toMatchObject({ flag: 'hard', flagAt: '2026-10-12', learned: '2026-10-09' })
    expect(mergeMarks(c, a).x?.flag).toBe('hard')
  })

  it('cleans flags: an unknown flag is dropped and a flag needs its day', () => {
    const c = cleanMarks({ a: { read: '', flag: 'hard', flagAt: '2026-10-01' }, b: { read: '', flag: 'weird', flagAt: '2026-10-01' }, c: { read: '', flag: 'star' } })
    expect(c.a).toEqual({ read: '', flag: 'hard', flagAt: '2026-10-01' })
    expect(c.b).toEqual({ read: '', flagAt: '2026-10-01' })
    expect(c.c).toEqual({ read: '' })
  })
})
