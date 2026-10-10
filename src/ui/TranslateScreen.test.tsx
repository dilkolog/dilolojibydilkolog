// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recentTranslations, translate } from '../data/translate'
import { TranslateScreen } from './TranslateScreen'

vi.mock('../data/translate', () => ({
  translate: vi.fn(),
  recentTranslations: vi.fn(),
  TranslateError: class extends Error {},
}))

vi.mock('./useTranslationReady', () => ({
  useTranslationReady: () => true,
}))

describe('TranslateScreen', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const mockTranslate = vi.mocked(translate)
  const mockRecent = vi.mocked(recentTranslations)

  beforeEach(() => {
    vi.clearAllMocks()
    window.scrollTo = vi.fn()
    mockRecent.mockResolvedValue([])
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const mount = async (lang: 'fr' | 'es' = 'fr') => {
    await act(async () => {
      root.render(<TranslateScreen language={lang} />)
    })
  }

  const getTextarea = () => container.querySelector('textarea') as HTMLTextAreaElement
  const changeText = (value: string) => {
    const textarea = getTextarea()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(textarea, value)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const getTranslateBtn = () => {
    const buttons = Array.from(container.querySelectorAll('button'))
    return buttons.find((b) => b.textContent?.trim() === 'Çevir') as HTMLButtonElement
  }
  const getSwapBtn = () => container.querySelector('button[aria-label="Yönü değiştir"]') as HTMLButtonElement

  it('swapping direction makes current translation the new text', async () => {
    mockTranslate.mockResolvedValue('Merhaba.')
    await mount('fr')

    act(() => {
      changeText('Bonjour.')
    })

    const translateBtn = getTranslateBtn()
    await act(async () => {
      translateBtn.click()
    })

    // Check that translation result is shown
    expect(container.querySelector('.translate-result')).not.toBeNull()
    expect(container.querySelector('.translate-target')?.textContent).toBe('Merhaba.')

    // Swap direction
    const swapBtn = getSwapBtn()
    act(() => {
      swapBtn.click()
    })

    // Textarea now contains the previous translation
    expect(getTextarea().value).toBe('Merhaba.')
    // Results are cleared
    expect(container.querySelector('.translate-result')).toBeNull()
  })

  it('drops "Örnek:" prefix label when requesting translation', async () => {
    mockTranslate.mockResolvedValue('İyi günler dünya.')
    await mount('fr')

    act(() => {
      changeText('Örnek: Bonjour tout le monde.')
    })

    const translateBtn = getTranslateBtn()
    await act(async () => {
      translateBtn.click()
    })

    // "Örnek:" prefix was stripped before calling translate
    expect(mockTranslate).toHaveBeenCalledWith('Bonjour tout le monde.', 'fr', 'tr')
  })

  it('requests repeated sentences only once from the translation service', async () => {
    mockTranslate.mockImplementation(async (text) => `çeviri:${text}`)
    await mount('fr')

    act(() => {
      // Same sentence repeated twice
      changeText('Bonjour. Bonjour.')
    })

    const translateBtn = getTranslateBtn()
    await act(async () => {
      translateBtn.click()
    })

    // translate should only be called once for 'Bonjour.'
    expect(mockTranslate).toHaveBeenCalledTimes(1)
    expect(mockTranslate).toHaveBeenCalledWith('Bonjour.', 'fr', 'tr')

    // But results display both sentence pairs
    const pairs = container.querySelectorAll('.translate-pairs > li')
    expect(pairs.length).toBe(2)
  })

  it('shows unique recent translations and reopens them when tapped', async () => {
    mockRecent.mockResolvedValue([
      { at: 1000, from: 'fr', to: 'tr', text: 'Merci beaucoup.', translation: 'Çok teşekkürler.' },
      { at: 900, from: 'fr', to: 'tr', text: 'Merci beaucoup.', translation: 'Çok teşekkürler.' }, // duplicate pair
      { at: 800, from: 'fr', to: 'tr', text: 'Au revoir.', translation: 'Görüşmek üzere.' },
    ])

    await mount('fr')

    const recentItems = container.querySelectorAll('.translate-recent > li')
    // Duplicates filtered out by uniquePairs
    expect(recentItems.length).toBe(2)

    // Tap on the first recent item
    const firstRecentBtn = recentItems[0].querySelector('button') as HTMLButtonElement
    act(() => {
      firstRecentBtn.click()
    })

    // Sets text and pairs in main translation view
    expect(getTextarea().value).toBe('Merci beaucoup.')
    expect(container.querySelector('.translate-target')?.textContent).toBe('Çok teşekkürler.')
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
