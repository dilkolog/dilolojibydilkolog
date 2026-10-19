// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { WordCard } from './DictionaryCard'
import { createEntry } from '../data/wordInput'
import type { PackRecord } from '../data/wordpackBuild'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('DictionaryCard personal meaning and memory note affordance', () => {
  const sampleRec: PackRecord = {
    t: ['köpek', 'it'],
    c: [['Le chien aboie.', 'Köpek havlıyor.']],
  }

  it('renders default pack meaning and affordance button to add personal meaning', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <WordCard
          language="fr"
          word="chien"
          rec={sampleRec}
          rank={120}
          onFix={vi.fn()}
          onOpenWord={vi.fn()}
          onAdd={vi.fn()}
          onPick={vi.fn()}
        />,
      )
    })

    const gloss = container.querySelector('.gloss')
    expect(gloss?.textContent).toBe('köpek, it')

    const fixBtn = container.querySelector<HTMLButtonElement>('.dict-fix-btn')
    expect(fixBtn).not.toBeNull()
    expect(fixBtn?.textContent).toContain('Anlamı düzelt')

    root.unmount()
    container.remove()
  })

  it('displays user memory note when own word has notes', async () => {
    const ownEntry = {
      ...createEntry({ word: 'chien', meaning: 'köpek' }, 'fr', new Date('2026-10-10T10:00:00.000Z')),
      notes: 'Benim çocukluk köpeğimin adı Rex idi',
    }

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <WordCard
          language="fr"
          word="chien"
          rec={sampleRec}
          rank={120}
          own={ownEntry}
          onFix={vi.fn()}
          onOpenWord={vi.fn()}
          onAdd={vi.fn()}
          onPick={vi.fn()}
        />,
      )
    })

    const noteEl = container.querySelector('.dict-own-note')
    expect(noteEl).not.toBeNull()
    expect(noteEl?.textContent).toContain('Hafıza ipucun:')
    expect(noteEl?.textContent).toContain('Benim çocukluk köpeğimin adı Rex idi')

    root.unmount()
    container.remove()
  })

  it('displays custom badge and pack reference when fix is active, and supports resetting', async () => {
    const onFix = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <WordCard
          language="fr"
          word="chien"
          rec={sampleRec}
          rank={120}
          fix={['sadık dost', 'köpek']}
          onFix={onFix}
          onOpenWord={vi.fn()}
          onAdd={vi.fn()}
          onPick={vi.fn()}
        />,
      )
    })

    const gloss = container.querySelector('.gloss')
    expect(gloss?.textContent).toBe('sadık dost, köpek')

    const customBadge = container.querySelector('.dict-custom-badge')
    expect(customBadge?.textContent).toContain('Senin anlamın')

    const resetBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Paketteki anlama dön'))
    expect(resetBtn).toBeDefined()

    act(() => {
      resetBtn?.click()
    })
    expect(onFix).toHaveBeenCalledWith([])

    root.unmount()
    container.remove()
  })
})
