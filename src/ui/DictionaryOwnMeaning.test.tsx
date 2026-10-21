// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { VocabularyEntry } from '../engine/types'
import { AiContext } from './aiContext'
import { DictionaryScreen } from './Dictionary'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.stubGlobal('fetch', async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }))

const ready = vi.hoisted(() => ({ value: true }))
const translateMock = vi.hoisted(() => vi.fn())
const enrichMock = vi.hoisted(() => vi.fn())
vi.mock('../data/translate', () => ({ translationReady: async () => ready.value, translate: translateMock }))
vi.mock('../ai', async (importOriginal) => ({ ...(await importOriginal<typeof import('../ai')>()), enrichWords: enrichMock }))
// "chocar" is in the Spanish pack without a Turkish meaning (as in the real pack); "choquar" is not in the pack at all.
vi.mock('../data/wordpack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/wordpack')>()
  return {
    ...actual,
    loadPack: vi.fn(async () => ({
      w: { chocar: { p: 'v' }, gato: { p: 'n', g: 'm', t: ['kedi'] }, poder: { p: 'v', t: ['yapabilmek', 'güç'] }, puede: {}, mujer: { p: 'n', t: ['kadın'] }, mujeres: {} },
      f: { puede: 'poder' },
    })),
  }
})

describe('Dictionary: the learner’s own meaning of a word', () => {
  let el: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  beforeEach(async () => {
    ready.value = true
    translateMock.mockReset()
    enrichMock.mockReset()
    await db.meta.clear()
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })
  afterEach(() => {
    act(() => root.unmount())
    el.remove()
  })

  const mount = async (query: string, { vocabulary = [] as VocabularyEntry[], apiKey = null as string | null, onOpenWord = vi.fn() } = {}) => {
    await act(async () =>
      root.render(
        <AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}>
          <DictionaryScreen language="es" vocabulary={vocabulary} initialQuery={query} onOpenWord={onOpenWord} onAdd={() => {}} />
        </AiContext.Provider>,
      ),
    )
    await act(async () => new Promise((r) => setTimeout(r, 80)))
    return onOpenWord
  }
  const button = (text: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
  const field = () => el.querySelector<HTMLInputElement>('#dict-fix')
  const type = async (input: HTMLInputElement, value: string) =>
    act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  const click = (text: string) => act(async () => button(text)!.click())
  const settle = () => act(async () => new Promise((r) => setTimeout(r, 40)))
  const stored = async () => (await db.getDictionaryNotes('es')).fixes.chocar?.t

  it('offers DeepL for a pack word without a Turkish meaning, and puts the answer in the field to check and save', async () => {
    translateMock.mockResolvedValue('çarpmak')
    await mount('chocar')
    expect(el.textContent).toContain('Türkçe karşılığı pakette yok')
    await click('DeepL ile çevir')
    expect(translateMock).toHaveBeenCalledWith('chocar', 'es', 'tr')
    // A suggestion: in the field, not saved yet.
    expect(field()?.value).toBe('çarpmak')
    expect(el.textContent).toContain('DeepL önerisi')
    expect(await stored()).toBeUndefined()
    await type(field()!, 'çarpmak, çarpışmak')
    await click('Kaydet')
    await settle()
    expect(el.querySelector('.gloss')?.textContent).toBe('çarpmak, çarpışmak')
    expect(await stored()).toEqual(['çarpmak', 'çarpışmak'])
  })

  it('offers DeepL in the open form too (after “Kendi anlamını ekle”), and says why when there is no answer', async () => {
    translateMock.mockResolvedValue('chocar')
    await mount('chocar')
    await click('Kendi anlamını ekle')
    expect(button('DeepL ile çevir')).toBeDefined()
    await click('DeepL ile çevir')
    expect(el.textContent).toContain('DeepL bu kelime için bir karşılık bulamadı')
    expect(field()?.value).toBe('')
  })

  it('offers the AI with a key, and its meanings fill the field', async () => {
    ready.value = false
    enrichMock.mockResolvedValue(new Map([['chocar', { lemma: 'chocar', meanings: ['çarpmak', 'şaşırtmak'] }]]))
    await mount('chocar', { apiKey: 'sk-test' })
    expect(button('DeepL ile çevir')).toBeUndefined()
    await click('YZ ile anlamını bul')
    expect(field()?.value).toBe('çarpmak, şaşırtmak')
    expect(el.textContent).toContain('YZ önerisi')
  })

  it('offers neither where translation is off and there is no AI key', async () => {
    ready.value = false
    await mount('chocar')
    expect(button('DeepL ile çevir')).toBeUndefined()
    expect(button('YZ ile anlamını bul')).toBeUndefined()
  })

  it('does not offer DeepL for a pack word that has a meaning', async () => {
    await mount('gato')
    expect(button('DeepL ile çevir')).toBeUndefined()
  })

  it('a wrong meaning saved can be edited (shown in the field) and taken out again', async () => {
    await mount('chocar')
    await click('Kendi anlamını ekle')
    await type(field()!, 'choquar con')
    await click('Kaydet')
    await settle()
    expect(el.querySelector('.gloss')?.textContent).toBe('choquar con')
    expect(await stored()).toEqual(['choquar con'])

    // Edit: the saved value is in the field.
    await click('Anlamı düzelt')
    expect(field()?.value).toBe('choquar con')
    await type(field()!, 'çarpmak')
    await click('Kaydet')
    await settle()
    expect(el.querySelector('.gloss')?.textContent).toBe('çarpmak')
    expect(await stored()).toEqual(['çarpmak'])

    // Remove it with the button: back to no meaning, and the translate offer is there again.
    const remove = button('Anlamımı kaldır')
    expect(remove).toBeDefined()
    expect(button('Paketteki anlama dön')).toBeUndefined()
    await click('Anlamımı kaldır')
    await settle()
    expect(await stored()).toBeUndefined()
    expect(el.textContent).toContain('Türkçe karşılığı pakette yok')
    expect(button('DeepL ile çevir')).toBeDefined()
  })

  it('an emptied field saved removes the meaning too, and so does the form’s own remove button', async () => {
    await db.saveDictionaryNotes('es', { fixes: { chocar: { t: ['choquar con'], at: '2026-10-20T10:00:00.000Z' } }, looked: {}, added: {} })
    await mount('chocar')
    await click('Anlamı düzelt')
    await type(field()!, '  ')
    await click('Kaydet')
    await settle()
    expect(await stored()).toBeUndefined()

    await db.saveDictionaryNotes('es', { fixes: { chocar: { t: ['choquar con'], at: '2026-10-20T10:00:00.000Z' } }, looked: {}, added: {} })
    act(() => root.unmount())
    root = createRoot(el)
    await mount('chocar')
    await click('Anlamı düzelt')
    await click('Anlamımı kaldır')
    await settle()
    expect(await stored()).toBeUndefined()
    expect(field()).toBeNull()
  })

  it('a word only in the learner’s list: its meaning is the list’s, fixed on the word page, not hidden under a dictionary note', async () => {
    const entry = createEntry({ word: 'choquar', meaning: 'choquar con', partOfSpeech: 'verb' }, 'es', new Date('2026-10-20T10:00:00.000Z'))
    const onOpenWord = await mount('choquar', { vocabulary: [entry] })
    expect(el.querySelector('.gloss')?.textContent).toBe('choquar con')
    expect(el.textContent).toContain('anlamı kelimelerindeki kartından geliyor')
    // No dictionary-only correction that would cover the card's meaning (and come back when taken out).
    expect(button('Anlamı düzelt')).toBeUndefined()
    await click('Kelime sayfasında düzelt')
    expect(onOpenWord).toHaveBeenCalledWith(entry.id)
  })

  it('a dictionary note saved earlier over a list-only word is shown as such and can be taken out', async () => {
    const entry = createEntry({ word: 'choquar', meaning: 'choquar con', partOfSpeech: 'verb' }, 'es', new Date('2026-10-20T10:00:00.000Z'))
    await db.saveDictionaryNotes('es', { fixes: { choquar: { t: ['çarpmak'] , at: '2026-10-20T10:00:00.000Z' } }, looked: {}, added: {} })
    await mount('choquar', { vocabulary: [entry] })
    expect(el.querySelector('.gloss')?.textContent).toBe('çarpmak')
    expect(el.textContent).toContain('Kelimelerinde: choquar con')
    await click('Kelimelerindeki anlama dön')
    await settle()
    expect((await db.getDictionaryNotes('es')).fixes.choquar).toBeUndefined()
    expect(el.querySelector('.gloss')?.textContent).toBe('choquar con')
  })

  it('a pack word in the list with another meaning on its card: says so, with the way to the word page', async () => {
    const entry = createEntry({ word: 'gato', meaning: 'erkek kedi' }, 'es', new Date('2026-10-20T10:00:00.000Z'))
    const onOpenWord = await mount('gato', { vocabulary: [entry] })
    expect(el.querySelector('.gloss')?.textContent).toBe('kedi')
    expect(el.textContent).toContain('Kelimelerindeki kartta: erkek kedi')
    await click('Kelime sayfasında düzelt')
    expect(onOpenWord).toHaveBeenCalledWith(entry.id)
  })

  it('a form without a meaning shows the meaning of its word, with a link to it; DeepL waits in the form', async () => {
    await mount('puede')
    expect(el.querySelector('.gloss')?.textContent).toContain('poder: yapabilmek, güç')
    expect(el.querySelector('.gloss.muted')).toBeNull()
    expect(button('DeepL ile çevir')).toBeUndefined()
    await click('Kendi anlamını ekle')
    expect(button('DeepL ile çevir')).toBeDefined()
    await click('Vazgeç')
    await act(async () => el.querySelector<HTMLButtonElement>('.gloss button')!.click())
    await settle()
    expect(el.querySelector('h2.word')?.textContent).toBe('poder')
    expect(el.querySelector('.gloss')?.textContent).toBe('yapabilmek, güç')
  })

  it('a plural without a meaning finds its singular by the ending', async () => {
    await mount('mujeres')
    expect(el.querySelector('.gloss')?.textContent).toContain('mujer: kadın')
  })
})
