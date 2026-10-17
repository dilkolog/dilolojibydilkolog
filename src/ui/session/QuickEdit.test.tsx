// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'
import { createEntry } from '../../data/wordInput'
import type { VocabularyEntry } from '../../engine/types'
import { QuickEditDialog } from './QuickEdit'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const sampleEntry: VocabularyEntry = createEntry(
  {
    word: 'bonjour',
    meaning: 'merhaba, günaydın',
    example: '*Bonjour* tout le monde !',
    exampleTranslation: 'Herkese merhaba!',
  },
  'fr',
  new Date('2026-01-01'),
)

describe('QuickEditDialog', () => {
  let el: HTMLDivElement
  let root: Root

  beforeEach(() => {
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })

  afterEach(() => {
    act(() => root.unmount())
    el.remove()
    vi.restoreAllMocks()
  })

  it('renders dialog header with the illustrated 3D head-edit icon and title', () => {
    act(() => {
      root.render(<QuickEditDialog entry={sampleEntry} onSaved={vi.fn()} onClose={vi.fn()} />)
    })

    const title = el.querySelector('#qe-title')
    expect(title?.textContent).toBe('Kelimeyi düzelt')

    const art = el.querySelector('img.ss-head-art') as HTMLImageElement
    expect(art).not.toBeNull()
    expect(art.src).toContain('head-edit.webp')
    expect(art.getAttribute('width')).toBe('40')
    expect(art.getAttribute('height')).toBe('40')
  })

  it('populates fields with existing word data', () => {
    act(() => {
      root.render(<QuickEditDialog entry={sampleEntry} onSaved={vi.fn()} onClose={vi.fn()} />)
    })

    const wordInput = el.querySelector('input[lang="fr"]') as HTMLInputElement
    const meaningInput = el.querySelectorAll('input.input')[1] as HTMLInputElement
    const exampleTextarea = el.querySelector('textarea') as HTMLTextAreaElement

    expect(wordInput.value).toBe('bonjour')
    expect(meaningInput.value).toBe('merhaba, günaydın')
    expect(exampleTextarea.value).toBe('Bonjour tout le monde !')
  })

  it('closes when close button or cancel button is clicked', () => {
    const onClose = vi.fn()
    act(() => {
      root.render(<QuickEditDialog entry={sampleEntry} onSaved={vi.fn()} onClose={onClose} />)
    })

    const closeBtn = el.querySelector('button[aria-label="Kapat"]') as HTMLButtonElement
    act(() => closeBtn.click())
    expect(onClose).toHaveBeenCalledTimes(1)

    const cancelBtn = [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Vazgeç')
    act(() => cancelBtn?.click())
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('closes on Escape key press', () => {
    const onClose = vi.fn()
    act(() => {
      root.render(<QuickEditDialog entry={sampleEntry} onSaved={vi.fn()} onClose={onClose} />)
    })

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('saves updated word entry to db and calls onSaved callback', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    const putSpy = vi.spyOn(db.vocabulary, 'put').mockResolvedValue('fr:bonjour')

    act(() => {
      root.render(<QuickEditDialog entry={sampleEntry} onSaved={onSaved} onClose={onClose} />)
    })

    const meaningInput = el.querySelectorAll('input.input')[1] as HTMLInputElement
    act(() => {
      meaningInput.value = 'selam, günaydın'
      meaningInput.dispatchEvent(new Event('input', { bubbles: true }))
      meaningInput.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const form = el.querySelector('form.quick-edit') as HTMLFormElement
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(putSpy).toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        lemma: 'bonjour',
      }),
    )
  })
})
