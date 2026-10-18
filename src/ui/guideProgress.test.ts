// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/instance'
import type { GuideMarks } from '../engine/guideReview'
import { checkAwards, loadMarks, markChecked, markFlag, markKnown, markPutOff, markRead, unmarkKnown } from './guideProgress'
import { reviewDay } from '../engine/guideReview'

describe('guideProgress state management', () => {
  beforeEach(async () => {
    localStorage.clear()
    await db.meta.clear()
  })

  it('marks a topic as read or unread', () => {
    let marks: GuideMarks = {}
    marks = markRead(marks, 'articles_en', true)
    expect(marks['articles_en']).toBeDefined()
    expect(marks['articles_en']?.read).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Unmarking leaves the day it was unmarked (so sync does not bring the mark back)
    marks = markRead(marks, 'articles_en', false)
    expect(marks['articles_en']?.read).toBe('')
    expect(marks['articles_en']?.off).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Marked again: read once more, the old check forgotten
    marks = markRead(marks, 'articles_en', true)
    expect(marks['articles_en']?.read).toMatch(/^\d{4}-/)
    expect(marks['articles_en']?.learned).toBeUndefined()
  })

  it('updates marks after checking a lesson (pass / fail)', () => {
    let marks: GuideMarks = {}
    marks = markChecked(marks, 'subjonctif', true)
    expect(marks['subjonctif']).toBeDefined()
    expect(marks['subjonctif']?.learned).toBeDefined()
    expect(marks['subjonctif']?.reviewed).toBeDefined()
    expect(marks['subjonctif']?.step).toBe(0)

    // Second pass advances step
    marks = markChecked(marks, 'subjonctif', true)
    expect(marks['subjonctif']?.step).toBe(1)

    // Failing resets step to 0
    const failedMarks = markChecked(marks, 'subjonctif', false)
    expect(failedMarks['subjonctif']?.step).toBe(0)
  })

  it('puts off a scheduled review on Today', () => {
    let marks = markChecked({}, 'por_para', true)
    const initialReviewed = marks['por_para']?.reviewed
    expect(initialReviewed).toBeDefined()

    marks = markPutOff(marks, 'por_para')
    expect(marks['por_para']?.reviewed).toBeDefined()
  })

  it('persists and loads marks from the database, merged with what is stored', async () => {
    const original = {
      articles_en: { read: '2026-10-15', learned: '2026-10-15', reviewed: '2026-10-18', step: 1 },
    }
    await db.saveGuideMarks(original)
    // A screen holding older marks does not undo the stored ones.
    await db.saveGuideMarks({ articles_en: { read: '2026-10-15' }, subjonctif: { read: '2026-10-16' } })

    const loaded = await loadMarks(db)
    expect(loaded.articles_en).toEqual(original.articles_en)
    expect(loaded.subjonctif?.read).toBe('2026-10-16')
  })

  it('migrates the marks kept in the browser by older versions, once', async () => {
    localStorage.setItem('diloloji:guide-progress', JSON.stringify({ por_para: { read: '2026-10-10', learned: '2026-10-11', step: 1 }, bad: 7 }))
    const loaded = await loadMarks(db)
    expect(loaded.por_para?.step).toBe(1)
    expect(loaded.bad).toBeUndefined()
    expect(localStorage.getItem('diloloji:guide-progress')).toBeNull()
    expect(Object.keys(await db.getGuideMarks())).toEqual(['por_para'])
  })

  it('migrates legacy array format from diloloji:guide-read', async () => {
    localStorage.setItem('diloloji:guide-read', JSON.stringify(['articles_en', 'present_perfect']))

    const loaded = await loadMarks(db)
    expect(loaded['articles_en']?.read).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(loaded['present_perfect']).toBeDefined()
  })

  it('flags a lesson, keeps the flag through unmarking and starting over, and takes it off', () => {
    let marks: GuideMarks = markFlag({}, 'por_para', 'hard')
    expect(marks['por_para']).toMatchObject({ read: '', flag: 'hard' })
    expect(marks['por_para']?.flagAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    marks = markRead(marks, 'por_para', true)
    expect(marks['por_para']).toMatchObject({ flag: 'hard' })
    expect(marks['por_para']?.read).toMatch(/^\d{4}-/)
    marks = markRead(marks, 'por_para', false)
    expect(marks['por_para']).toMatchObject({ read: '', flag: 'hard' })
    marks = markChecked(marks, 'por_para', true)
    expect(marks['por_para']).toMatchObject({ flag: 'hard', step: 0 })
    marks = markFlag(marks, 'por_para', null)
    expect(marks['por_para']?.flag).toBeUndefined()
    expect(marks['por_para']?.flagAt).toBeDefined()
    expect(marks['por_para']?.learned).toBeDefined()
  })

  it('what is done the same day it was marked is what is kept: read, checked, then unmarked', async () => {
    let marks = markChecked({}, 'por_para', true)
    await db.saveGuideMarks(marks)
    marks = markRead(marks, 'por_para', false)
    await db.saveGuideMarks(marks)
    expect(await db.getGuideMarks()).toMatchObject({ por_para: { read: '' } })
    expect(await loadMarks(db)).toMatchObject({ por_para: { read: '' } })
  })
})

describe('checkAwards', () => {
  const lessons = [
    { topic: 'a', level: 'A1' as const },
    { topic: 'b', level: 'A1' as const },
    { topic: 'c', level: 'A1' as const },
  ]
  const pass = (marks: GuideMarks, topic: string) => markChecked(marks, topic, true)

  it('pays the lesson once, a review step per step, and the certificate when the level is complete', () => {
    let marks: GuideMarks = {}
    let next = pass(marks, 'a')
    expect(checkAwards('fr', lessons, marks, next, 'a', '2026-10-13')).toEqual([{ key: 'lesson|a', day: '2026-10-13', xp: 20 }])
    marks = next
    next = pass(marks, 'a')
    expect(checkAwards('fr', lessons, marks, next, 'a', '2026-10-20')).toEqual([{ key: 'review|a|1', day: '2026-10-20', xp: 10 }])
    marks = pass(pass(next, 'b'), 'b')
    next = pass(marks, 'c')
    const awards = checkAwards('fr', lessons, marks, next, 'c', '2026-10-21')
    expect(awards.map((a) => [a.key, a.xp])).toEqual([['lesson|c', 20], ['cert|fr|A1', 100]])
  })

  it('pays nothing for a failed check, and keys let a lesson learned again earn nothing twice', () => {
    const marks: GuideMarks = {}
    expect(checkAwards('fr', lessons, marks, markChecked(marks, 'a', false), 'a', '2026-10-13')).toEqual([])
    const learned = pass(marks, 'a')
    const again = pass(markRead(learned, 'a', false), 'a')
    const [first] = checkAwards('fr', lessons, markRead(learned, 'a', false), again, 'a', '2026-10-15')
    expect(first.key).toBe('lesson|a')
  })
})

describe('markKnown', () => {
  it('marks lessons read long ago with no review to come, and leaves what is read alone', () => {
    const marks: GuideMarks = { done: { read: '2026-10-01', learned: '2026-10-01', step: 0 }, flagged: { read: '', off: '2026-09-01', flagAt: '2026-09-02', flag: 'star' } }
    const next = markKnown(marks, ['done', 'flagged', 'fresh'])
    expect(next.done).toEqual(marks.done)
    expect(next.fresh).toEqual({ read: '2000-01-01', step: 3 })
    // A flag set before is kept.
    expect(next.flagged).toMatchObject({ read: '2000-01-01', step: 3, flag: 'star' })
    expect(reviewDay(next.fresh)).toBeNull()
    expect(next.fresh!.learned).toBeUndefined()
  })

  it('takes the marking back only for lessons still carrying the placement day', () => {
    const marks = markKnown({ real: { read: '2026-10-01' } }, ['a', 'real'])
    const back = unmarkKnown({ ...marks, real: { read: '2026-10-01' } }, ['a', 'real'])
    expect(back.a).toMatchObject({ read: '' })
    expect(back.a!.off).toMatch(/^\d{4}-/)
    expect(back.real).toEqual({ read: '2026-10-01' })
  })
})
