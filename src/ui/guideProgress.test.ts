// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import type { GuideMarks } from '../engine/guideReview'
import { loadMarks, markChecked, markPutOff, markRead, saveMarks } from './guideProgress'

describe('guideProgress state management', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('marks a topic as read or unread', () => {
    let marks: GuideMarks = {}
    marks = markRead(marks, 'articles_en', true)
    expect(marks['articles_en']).toBeDefined()
    expect(marks['articles_en']?.read).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Unmarking removes it
    marks = markRead(marks, 'articles_en', false)
    expect(marks['articles_en']).toBeUndefined()
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

  it('persists and loads marks from localStorage', () => {
    const original = {
      articles_en: { read: '2026-10-15', learned: '2026-10-15', next: '2026-10-18', step: 1 },
    }
    saveMarks(original)

    const loaded = loadMarks()
    expect(loaded).toEqual(original)
  })

  it('migrates legacy array format from diloloji:guide-read', () => {
    localStorage.setItem('diloloji:guide-read', JSON.stringify(['articles_en', 'present_perfect']))

    const loaded = loadMarks()
    expect(loaded['articles_en']).toBeDefined()
    expect(loaded['articles_en']?.read).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(loaded['present_perfect']).toBeDefined()
  })
})
