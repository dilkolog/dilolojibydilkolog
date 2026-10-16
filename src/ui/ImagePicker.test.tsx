// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImagePicker } from './ImagePicker'
import * as imageSearch from '../data/imageSearch'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ImagePicker component', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.stubGlobal('createImageBitmap', async () => ({
      width: 400,
      height: 300,
      close: vi.fn(),
    }))
  })

  afterEach(async () => {
    container.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders search input, Google bridge link, and pro-tip banner', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(imageSearch, 'searchImages').mockResolvedValue([])

    const root = createRoot(container)
    await act(async () => {
      root.render(
        <ImagePicker
          initialQuery="pomme"
          suggestions={['elma']}
          onPick={onPick}
          onClose={onClose}
        />
      )
    })

    expect(container.querySelector('[role="dialog"]')).toBeTruthy()
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('pomme')

    const googleBtn = container.querySelector('.google-bridge-btn') as HTMLAnchorElement
    expect(googleBtn).toBeTruthy()
    expect(googleBtn.href).toContain('google.com/search')
    expect(googleBtn.href).toContain('q=pomme')

    // Pro-tip banner is present
    expect(container.textContent).toContain('Resmi Kopyala')
    expect(container.textContent).toContain('⌘V')

    await act(async () => root.unmount())
  })

  it('renders smart suggestion chips including visual modifiers', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(imageSearch, 'searchImages').mockResolvedValue([])

    const root = createRoot(container)
    await act(async () => {
      root.render(
        <ImagePicker
          initialQuery="nephew"
          suggestions={['yeğen']}
          onPick={onPick}
          onClose={onClose}
        />
      )
    })

    const chips = [...container.querySelectorAll('.chip')].map((c) => c.textContent)
    expect(chips).toContain('nephew')
    expect(chips).toContain('yeğen')
    expect(chips).toContain('+ İllüstrasyon')
    expect(chips).toContain('+ Çizim')
    expect(chips).toContain('+ Sade Nesne')

    await act(async () => root.unmount())
  })

  it('switches to paste tab and displays URL input', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(imageSearch, 'searchImages').mockResolvedValue([])

    const root = createRoot(container)
    await act(async () => {
      root.render(
        <ImagePicker
          initialQuery="book"
          onPick={onPick}
          onClose={onClose}
        />
      )
    })

    const pasteTabBtn = [...container.querySelectorAll('.segmented-btn')].find(
      (b) => b.textContent?.includes('Kopyala & Yapıştır')
    ) as HTMLButtonElement
    expect(pasteTabBtn).toBeTruthy()

    await act(async () => {
      pasteTabBtn.click()
    })

    expect(container.textContent).toContain('ile Yapıştır')
    expect(container.querySelector('input[placeholder*="https://"]')).toBeTruthy()

    await act(async () => root.unmount())
  })

  it('allows configuring and toggling Pixabay API key', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(imageSearch, 'searchImages').mockResolvedValue([])

    const root = createRoot(container)
    await act(async () => {
      root.render(
        <ImagePicker
          initialQuery="house"
          onPick={onPick}
          onClose={onClose}
        />
      )
    })

    // Initially shows Pixabay add button
    const pixBtn = container.querySelector('.pixabay-bar button') as HTMLButtonElement
    expect(pixBtn.textContent).toContain('Pixabay HD Anahtarı Ekle')

    await act(async () => {
      pixBtn.click()
    })

    const pixInput = container.querySelector('input[type="password"]') as HTMLInputElement
    expect(pixInput).toBeTruthy()

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(pixInput, 'test-pix-key')
      pixInput.dispatchEvent(new Event('input', { bubbles: true }))
      pixInput.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const saveForm = container.querySelector('.pixabay-config-card') as HTMLFormElement
    await act(async () => {
      saveForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(imageSearch.getPixabayKey()).toBe('test-pix-key')
    expect(container.textContent).toContain('Pixabay HD Aktif')

    // Remove key
    const removeBtn = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'Kaldır'
    ) as HTMLButtonElement
    expect(removeBtn).toBeTruthy()

    await act(async () => {
      removeBtn.click()
    })

    expect(imageSearch.getPixabayKey()).toBeNull()

    await act(async () => root.unmount())
  })

  it('closes dialog on close button click or Escape key', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(imageSearch, 'searchImages').mockResolvedValue([])

    const root = createRoot(container)
    await act(async () => {
      root.render(
        <ImagePicker
          initialQuery="test"
          onPick={onPick}
          onClose={onClose}
        />
      )
    })

    const closeBtn = container.querySelector('.icon-btn') as HTMLButtonElement
    await act(async () => {
      closeBtn.click()
    })
    expect(onClose).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).toHaveBeenCalledTimes(2)

    await act(async () => root.unmount())
  })
})
