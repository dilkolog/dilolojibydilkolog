// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, scheduler } from '../data/instance'
import { createEntry } from '../data/wordInput'
import { newWordState, processAttempt } from '../engine/review'
import type { UserWordState, VocabularyEntry } from '../engine/types'
import { ExamScreen } from './Exam'

const WORDS = ['maison', 'chat', 'manger', 'parler', 'aller', 'petit']

describe('Exam result: levels', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let vocabulary: VocabularyEntry[]
  let states: UserWordState[]

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const long = new Date(Date.now() - 20 * 86_400_000)
    vocabulary = WORDS.map((w) => createEntry({ word: w, meaning: `anlam-${w}` }, 'fr', long))
    states = vocabulary.map((e) => processAttempt(newWordState(e, long), { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 2000, hintsUsed: 0, maxHints: 0, at: long }, [], scheduler).state)
    await db.vocabulary.clear()
    await db.meta.delete('exams')
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  it('shows the answers grouped by CEFR band after the last question and saves them', async () => {
    await act(async () => {
      root.render(<ExamScreen db={db} language="fr" vocabulary={vocabulary} states={states} onDone={vi.fn()} />)
    })
    for (let i = 0; i < WORDS.length; i++) {
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      })
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      })
    }
    await vi.waitFor(() => expect(container.textContent).toContain('Seviyelere göre'))
    const saved = (await db.getExams()).at(-1)!
    expect(saved.levels?.reduce((s, l) => s + l.n, 0)).toBe(WORDS.length)
    expect(container.textContent).toContain('Resmî bir seviye sınavı değil')
  })
})
