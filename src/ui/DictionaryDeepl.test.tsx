// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
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
  beforeEach(async () => {
    ready.value = true
    translateMock.mockReset()
    await db.meta.clear()
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
    await act(async () => button('Kelimelerime ekle')!.click())
    expect(onAdd).toHaveBeenCalledWith('gribouiller', 'karalamak')
  })

  it('saves the answer to the dictionary for good: found again at once, after a reload, without DeepL', async () => {
    translateMock.mockResolvedValue('karalamak')
    await mount()
    await act(async () => button('DeepL ile çevir')!.click())
    await act(async () => button('Sözlüğe kaydet')!.click())
    await act(async () => new Promise((r) => setTimeout(r, 30)))
    expect(el.querySelector('[aria-label="Kaydettiğin kelime"]')?.textContent).toContain('karalamak')
    expect(el.textContent).toContain('DeepL, sen kaydettin')
    expect((await db.getDictionaryNotes('fr')).added?.gribouiller?.t).toEqual(['karalamak'])
    // A new visit: the word is there, and DeepL is not asked.
    act(() => root.unmount())
    translateMock.mockClear()
    root = createRoot(el)
    await mount()
    await act(async () => new Promise((r) => setTimeout(r, 30)))
    expect(el.querySelector('[aria-label="Kaydettiğin kelime"]')?.textContent).toContain('karalamak')
    expect(translateMock).not.toHaveBeenCalled()
    // Taken out again, it is gone for good.
    await act(async () => button('Sözlükten kaldır')!.click())
    await act(async () => new Promise((r) => setTimeout(r, 30)))
    expect(el.querySelector('[aria-label="Kaydettiğin kelime"]')).toBeNull()
    expect((await db.getDictionaryNotes('fr')).added).toEqual({})
  })

  it('saves a meaning typed by hand too, and lists the saved words when nothing is typed', async () => {
    ready.value = false
    await act(async () => root.render(<DictionaryScreen language="fr" vocabulary={[]} initialQuery="truc-machin" onOpenWord={() => {}} onAdd={() => {}} />))
    await act(async () => new Promise((r) => setTimeout(r, 80)))
    const input = el.querySelector<HTMLInputElement>('input[aria-label="Türkçe anlamı"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'şey, zımbırtı')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => button('Sözlüğe kaydet')!.click())
    await act(async () => new Promise((r) => setTimeout(r, 30)))
    expect((await db.getDictionaryNotes('fr')).added?.['truc-machin']).toMatchObject({ t: ['şey', 'zımbırtı'], from: 'own' })
    act(() => root.unmount())
    root = createRoot(el)
    await act(async () => root.render(<DictionaryScreen language="fr" vocabulary={[]} onOpenWord={() => {}} onAdd={() => {}} />))
    await act(async () => new Promise((r) => setTimeout(r, 80)))
    expect(el.textContent).toContain('Kaydettiklerin')
    expect(el.textContent).toContain('truc-machin')
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
    await act(async () => button('Sözlüğe kaydet')!.click())
    await act(async () => new Promise((r) => setTimeout(r, 30)))
    expect((await db.getDictionaryNotes('fr')).added?.gribouiller).toMatchObject({ t: ['çiziktirmek'], from: 'own' })
    expect(onAdd).not.toHaveBeenCalled()
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

  it('keeps the save/DeepL card when a saved word merely starts like the query, and lets a saved word be removed from the list', async () => {
    await db.saveDictionaryNotes('fr', { fixes: {}, looked: {}, added: { chaton: { t: ['yavru kedi'], at: '2026-10-01T00:00:00.000Z', from: 'own' } } })
    await act(async () => root.render(<DictionaryScreen language="fr" vocabulary={[]} initialQuery="chato" onOpenWord={() => {}} onAdd={() => {}} />))
    await act(async () => new Promise((r) => setTimeout(r, 80)))
    expect(button('DeepL ile çevir')).toBeDefined()
    expect(button('Sözlüğe kaydet')).toBeDefined()
    // The saved word is listed below, with its own remove button.
    const remove = el.querySelector<HTMLButtonElement>('button[aria-label="chaton sözlükten kaldır"]')!
    expect(remove).not.toBeNull()
    await act(async () => remove.click())
    await act(async () => new Promise((r) => setTimeout(r, 30)))
    expect((await db.getDictionaryNotes('fr')).added).toEqual({})
  })

  it('has no DeepL button where translation is not available', async () => {
    ready.value = false
    await mount()
    expect(button('DeepL ile çevir')).toBeUndefined()
  })
})
