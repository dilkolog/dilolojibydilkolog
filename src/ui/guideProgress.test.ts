// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/instance'
import type { GuideMarks } from '../engine/guideReview'
import { loadMarks, markChecked, markFlag, markPutOff, markRead } from './guideProgress'

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
})
