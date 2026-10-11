// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DictionaryScreen } from './Dictionary'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.stubGlobal('fetch', async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }))

const ready = vi.hoisted(() => ({ value: true }))
const translateMock = vi.hoisted(() => vi.fn())
vi.mock('../data/translate', () => ({ translationReady: async () => ready.value, translate: translateMock }))
vi.mock('../data/wordpack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/wordpack')>()
  return { ...actual, loadPack: vi.fn(async () => ({ w: { chat: { t: ['kedi'] } } })) }
})

describe('Dictionary: a word that is not in the pack', () => {
  let el: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    ready.value = true
    translateMock.mockReset()
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })
  afterEach(() => {
    act(() => root.unmount())
    el.remove()
  })

  const mount = async (onAdd = vi.fn()) => {
    await act(async () => root.render(<DictionaryScreen language="fr" vocabulary={[]} initialQuery="gribouiller" onOpenWord={() => {}} onAdd={onAdd} />))
    await act(async () => new Promise((r) => setTimeout(r, 80)))
    return onAdd
  }
  const button = (text: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

  it('offers DeepL, shows its answer as a guess, and adds it to the list on one tap', async () => {
    translateMock.mockResolvedValue('karalamak')
    const onAdd = await mount()
    expect(button('DeepL ile çevir')).toBeDefined()
    await act(async () => button('DeepL ile çevir')!.click())
    expect(translateMock).toHaveBeenCalledWith('gribouiller', 'fr', 'tr')
    expect(el.textContent).toContain('karalamak')
    expect(el.textContent).toContain('(DeepL)')
    await act(async () => button('Sözlüğe ekle')!.click())
    expect(onAdd).toHaveBeenCalledWith('gribouiller', 'karalamak')
  })

  it('lets the learner correct the answer before adding it', async () => {
    translateMock.mockResolvedValue('karalamak')
    const onAdd = await mount()
    await act(async () => button('DeepL ile çevir')!.click())
    const input = el.querySelector<HTMLInputElement>('input[aria-label="Türkçe anlamı"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'çiziktirmek')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => button('Sözlüğe ekle')!.click())
    expect(onAdd).toHaveBeenCalledWith('gribouiller', 'çiziktirmek')
  })

  it('says so when DeepL only gives the word back, and adds nothing', async () => {
    translateMock.mockResolvedValue('gribouiller')
    const onAdd = await mount()
    await act(async () => button('DeepL ile çevir')!.click())
    expect(el.textContent).toContain('DeepL bu kelime için bir karşılık bulamadı')
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('shows the reason when the translation fails', async () => {
    translateMock.mockRejectedValue(new Error('Bu ayın ücretsiz çeviri kotası doldu; gelecek ay yeniden açılır.'))
    await mount()
    await act(async () => button('DeepL ile çevir')!.click())
    expect(el.textContent).toContain('kotası doldu')
  })

  it('has no DeepL button where translation is not available', async () => {
    ready.value = false
    await mount()
    expect(button('DeepL ile çevir')).toBeUndefined()
  })
})
