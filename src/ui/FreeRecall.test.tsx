// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEntry } from '../data/wordInput'
import type { VocabularyEntry } from '../engine/types'
import { FreeRecall } from './FreeRecall'

describe('FreeRecall component', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const onWriting = vi.fn()
  let entries: VocabularyEntry[]

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    const now = new Date()
    entries = [
      createEntry({ word: 'la maison', meaning: 'ev' }, 'fr', now),
      createEntry({ word: 'le livre', meaning: 'kitap' }, 'fr', now),
      createEntry({ word: 'le soleil', meaning: 'güneş' }, 'fr', now),
      createEntry({ word: 'le chat', meaning: 'kedi' }, 'fr', now),
    ]
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const mount = async () => {
    await act(async () => {
      root.render(<FreeRecall entries={entries} onWriting={onWriting} />)
    })
  }

  it('starts in idle phase offering the activity with a CTA button', async () => {
    await mount()
    const offer = container.querySelector('.free-recall-offer')
    expect(offer).not.toBeNull()
    expect(container.textContent).toContain('Aklında kalanları yaz')
    expect(container.textContent).toContain('Başla')
  })

  it('clicking "Başla" switches to writing phase and notifies onWriting(true)', async () => {
    await mount()
    const startBtn = container.querySelector<HTMLButtonElement>('.free-recall-offer button')!
    await act(async () => {
      startBtn.click()
    })

    expect(onWriting).toHaveBeenCalledWith(true)
    const textarea = container.querySelector<HTMLTextAreaElement>('#free-recall-text')
    expect(textarea).not.toBeNull()

    // Title and hint should be distinct and properly formatted (not run-on together)
    const title = container.querySelector('.free-recall-title')
    const hint = container.querySelector('.free-recall-hint')
    expect(title?.textContent).toBe('Bu oturumda çalıştığın kelimelerden hangileri aklında?')
    expect(hint?.textContent).toContain('Virgülle ya da alt alta yaz; artikel ve aksan önemli değil.')

    // Submit button should be initially disabled
    const submitBtn = container.querySelector<HTMLButtonElement>('.free-recall-btn-submit')!
    expect(submitBtn.disabled).toBe(true)
  })

  it('updates live word count and enables submit button when typing', async () => {
    await mount()
    const startBtn = container.querySelector<HTMLButtonElement>('.free-recall-offer button')!
    await act(async () => {
      startBtn.click()
    })

    const textarea = container.querySelector<HTMLTextAreaElement>('#free-recall-text')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(textarea), 'value')!.set!.call(textarea, 'maison, livre')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(container.textContent).toContain('2 kelime yazıldı')
    const submitBtn = container.querySelector<HTMLButtonElement>('.free-recall-btn-submit')!
    expect(submitBtn.disabled).toBe(false)
  })

  it('submitting compares words, displays recalled and missed words, and notifies onWriting(false)', async () => {
    await mount()
    await act(async () => {
      container.querySelector<HTMLButtonElement>('.free-recall-offer button')!.click()
    })

    const textarea = container.querySelector<HTMLTextAreaElement>('#free-recall-text')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(textarea), 'value')!.set!.call(textarea, 'maison, soleil')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const submitBtn = container.querySelector<HTMLButtonElement>('.free-recall-btn-submit')!
    await act(async () => {
      submitBtn.click()
    })

    expect(onWriting).toHaveBeenCalledWith(false)
    expect(container.textContent).toMatch(/4 kelimeden 2 tanesini ipucu olmadan hatırladın/)

    // Recalled chips
    const recalledChips = container.querySelectorAll('.recall-chips li.is-recalled')
    expect(recalledChips.length).toBe(2)

    // Missed section
    expect(container.textContent).toContain('Aklına gelmeyenler (2)')
  })

  it('supports Cmd/Ctrl + Enter shortcut to compare', async () => {
    await mount()
    await act(async () => {
      container.querySelector<HTMLButtonElement>('.free-recall-offer button')!.click()
    })

    const textarea = container.querySelector<HTMLTextAreaElement>('#free-recall-text')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(textarea), 'value')!.set!.call(textarea, 'maison, livre, soleil, chat')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }))
    })

    expect(container.textContent).toMatch(/4 kelimeden 4 tanesini ipucu olmadan hatırladın/)
    expect(container.textContent).toContain('Mükemmel!')
  })

  it('allows clicking "Vazgeç" to cancel and return to idle', async () => {
    await mount()
    await act(async () => {
      container.querySelector<HTMLButtonElement>('.free-recall-offer button')!.click()
    })

    const cancelBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Vazgeç')
    expect(cancelBtn).toBeDefined()

    await act(async () => {
      cancelBtn!.click()
    })

    expect(onWriting).toHaveBeenCalledWith(false)
    expect(container.querySelector('.free-recall-offer')).not.toBeNull()
  })

  it('allows clicking "Düzenle / Ekle" in results to resume writing', async () => {
    await mount()
    await act(async () => {
      container.querySelector<HTMLButtonElement>('.free-recall-offer button')!.click()
    })

    const textarea = container.querySelector<HTMLTextAreaElement>('#free-recall-text')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(textarea), 'value')!.set!.call(textarea, 'maison')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      container.querySelector<HTMLButtonElement>('.free-recall-btn-submit')!.click()
    })

    const editBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Düzenle'))
    expect(editBtn).toBeDefined()

    await act(async () => {
      editBtn!.click()
    })

    expect(onWriting).toHaveBeenCalledWith(true)
    const resumedTextarea = container.querySelector<HTMLTextAreaElement>('#free-recall-text')
    expect(resumedTextarea?.value).toBe('maison')
  })
})
