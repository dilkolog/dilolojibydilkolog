// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WordsScreen } from './Words'
import type { KelimeDB } from '../data/db'
import type { VocabularyEntry } from '../engine/types'
import { createEntry } from '../data/wordInput'

vi.mock('../data/frequency', () => ({
  loadFrequency: vi.fn(async () => new Map()),
  rankOf: vi.fn(() => 0),
  UNRANKED: 99999,
}))

vi.mock('./useCefr', () => ({
  useCefr: vi.fn(() => null),
}))

const sampleVocab: VocabularyEntry[] = [
  { ...createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date('2026-01-01')), id: 'w-1', frequencyRank: 100 },
  { ...createEntry({ word: 'gouvernement', meaning: 'hükümet' }, 'fr', new Date('2026-01-02')), id: 'w-2', frequencyRank: 1200 },
  { ...createEntry({ word: 'ambassade', meaning: 'elçilik' }, 'fr', new Date('2026-01-03')), id: 'w-3', frequencyRank: 2500 },
]

describe('WordsScreen multi-select CEFR filter', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    root = createRoot(rootEl)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    rootEl.remove()
  })

  it('filters words by multiple CEFR levels simultaneously', async () => {
    const mockDb = {
      getLists: vi.fn(async () => []),
      vocabulary: {
        bulkPut: vi.fn(),
      },
    } as unknown as KelimeDB

    await act(async () => {
      root.render(
        <WordsScreen
          db={mockDb}
          language="fr"
          vocabulary={sampleVocab}
          states={[]}
          mistakes={[]}
          onChanged={() => {}}
          onOpen={() => {}}
          onStudy={() => {}}
        />,
      )
    })

    // Initially all 3 words are listed
    expect(rootEl.textContent).toContain('chat')
    expect(rootEl.textContent).toContain('gouvernement')
    expect(rootEl.textContent).toContain('ambassade')

    // Open filter popover
    const filterBtn = rootEl.querySelector<HTMLButtonElement>('.filter-btn')
    expect(filterBtn).not.toBeNull()
    act(() => {
      filterBtn?.click()
    })

    // Find CEFR chips
    const a1Chip = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('.chip')).find(
      (b) => b.textContent?.trim() === 'A1',
    )
    const a2Chip = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('.chip')).find(
      (b) => b.textContent?.trim() === 'A2',
    )
    expect(a1Chip).toBeDefined()
    expect(a2Chip).toBeDefined()

    const visibleWords = () =>
      Array.from(rootEl.querySelectorAll('.word-row .w, .word-item .word')).map((el) => el.textContent?.trim())

    // Select A1
    act(() => {
      a1Chip?.click()
    })
    expect(a1Chip?.getAttribute('aria-pressed')).toBe('true')
    expect(visibleWords()).toContain('chat')
    expect(visibleWords()).not.toContain('gouvernement')
    expect(visibleWords()).not.toContain('ambassade')

    // Multi-select: also select A2
    act(() => {
      a2Chip?.click()
    })
    expect(a2Chip?.getAttribute('aria-pressed')).toBe('true')
    expect(visibleWords()).toContain('chat')
    expect(visibleWords()).toContain('gouvernement')
    expect(visibleWords()).not.toContain('ambassade')

    // Deselect A1: only A2 remains
    act(() => {
      a1Chip?.click()
    })
    expect(a1Chip?.getAttribute('aria-pressed')).toBe('false')
    expect(visibleWords()).not.toContain('chat')
    expect(visibleWords()).toContain('gouvernement')
    expect(visibleWords()).not.toContain('ambassade')

    // Reset filters
    const resetBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.includes('Hepsini sıfırla'),
    )
    expect(resetBtn).toBeDefined()
    act(() => {
      resetBtn?.click()
    })

    expect(visibleWords()).toContain('chat')
    expect(visibleWords()).toContain('gouvernement')
    expect(visibleWords()).toContain('ambassade')
  })
})
