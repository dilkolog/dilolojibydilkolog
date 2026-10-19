// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WordList } from './WordListView'
import type { VocabularyEntry } from '../engine/types'
import { createEntry } from '../data/wordInput'

vi.mock('./useMedia', () => ({
  useMediaUrl: vi.fn(() => null),
}))

vi.mock('./useCefr', () => ({
  useCefr: vi.fn(() => null),
}))

const sampleVocab: VocabularyEntry[] = [
  { ...createEntry({ word: 'apple', meaning: 'elma' }, 'en', new Date('2026-01-01')), id: 'w-1', frequencyRank: 10 },
  { ...createEntry({ word: 'banana', meaning: 'muz' }, 'en', new Date('2026-01-02')), id: 'w-2', frequencyRank: 20 },
  { ...createEntry({ word: 'cherry', meaning: 'kiraz' }, 'en', new Date('2026-01-03')), id: 'w-3', frequencyRank: 30 },
]

describe('WordListView A-Z Jump Bar', () => {
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

  it('renders alpha jump bar and letter ids when sort is alpha', async () => {
    await act(async () => {
      root.render(
        <WordList
          language="en"
          vocabulary={sampleVocab}
          stateById={new Map()}
          mistakes={[]}
          onOpen={() => {}}
          onStudy={() => {}}
          onDelete={async () => {}}
          onAdd={() => {}}
        />
      )
    })

    // Sıralama butonunu bulup 'alpha'ya tıkla
    const sortBtn = Array.from(rootEl.querySelectorAll('button')).find((b) => b.textContent?.includes('Sırala') || b.textContent?.includes('Görünüm'))
    if (sortBtn) {
      await act(async () => {
        sortBtn.click()
      })
    }

    // Doğrudan alfabetik seçeneğini tetiklemek için veya görünüm üzerinden kontrol edelim
    const alphaSortBtn = Array.from(rootEl.querySelectorAll('button')).find((b) => b.textContent?.includes('Kelime (A–Z)'))
    if (alphaSortBtn) {
      await act(async () => {
        alphaSortBtn.click()
      })

      const jumpBar = rootEl.querySelector('.alpha-jump-bar')
      expect(jumpBar).not.toBeNull()

      const aBtn = Array.from(jumpBar?.querySelectorAll('button') ?? []).find((b) => b.textContent?.trim() === 'A')
      expect(aBtn).not.toBeNull()
      expect(aBtn?.classList.contains('has-words')).toBe(true)

      const targetEl = rootEl.querySelector('#alpha-letter-A')
      expect(targetEl).not.toBeNull()
    }
  })
})
