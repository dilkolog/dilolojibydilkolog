import { describe, expect, it } from 'vitest'
import { lessonMinutes, lessonsThisWeek, readToday } from './guideGoal'
import type { GuideMarks } from './guideReview'

// 2026-10-14 is a Wednesday: the week runs from Monday 2026-10-12.
const marks: GuideMarks = {
  a: { read: '2026-10-11' },
  b: { read: '2026-10-12' },
  c: { read: '2026-10-14', learned: '2026-10-14' },
  d: { read: '', off: '2026-10-13' },
}

describe('guide goal', () => {
  it('counts the lessons read since Monday, not the unmarked ones', () => {
    expect(lessonsThisWeek(marks, '2026-10-14')).toBe(2)
    expect(lessonsThisWeek(marks, '2026-10-11')).toBe(1)
    expect(lessonsThisWeek({}, '2026-10-14')).toBe(0)
  })

  it('tells whether a lesson was read today', () => {
    expect(readToday(marks, '2026-10-14')).toBe(true)
    expect(readToday(marks, '2026-10-13')).toBe(false)
  })

  it('estimates minutes from the words, never under two', () => {
    const word = (n: number) => Array.from({ length: n }, () => 'mot').join(' ')
    expect(lessonMinutes({ summary: 'Court.', rules: [], examples: [], watch: [] })).toBe(2)
    expect(lessonMinutes({ summary: word(110), rules: [word(220)], examples: [{ text: word(110), tr: word(110) }], watch: [word(110)], tip: word(55), table: { head: ['a'], rows: [[word(55)]] } })).toBe(8)
  })
})
