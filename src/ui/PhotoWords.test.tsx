// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PhotoWordsRequest, WordInfo } from '../ai'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { VocabularyEntry } from '../engine/types'
import { AiContext } from './aiContext'

const requests: PhotoWordsRequest[] = []
const card = (lemma: string, meaning: string): WordInfo => ({
  input: lemma,
  lemma,
  partOfSpeech: 'noun',
  gender: 'm',
  meanings: [meaning],
  example: `Voici un *${lemma}*.`,
  exampleTranslation: 'İşte.',
  collocations: [],
  confusables: [],
  frequencyBand: 'top3000',
  literal: '',
})
let result: WordInfo[] = []
vi.mock('../ai', async (orig) => ({
  ...(await orig<typeof import('../ai')>()),
  wordsFromPhoto: async (_key: string, req: PhotoWordsRequest) => {
    requests.push(req)
    return result
  },
}))
vi.mock('./downscaleImage', () => ({ downscaleImage: async () => new Blob(['jpeg-bytes'], { type: 'image/jpeg' }) }))
const { PhotoWords } = await import('./PhotoWords')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  requests.length = 0
  result = [card('fromage', 'peynir'), card('pain', 'ekmek')]
  await db.vocabulary.clear()
  URL.createObjectURL = () => 'blob:photo'
  URL.revokeObjectURL = () => {}
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))
const own = (): VocabularyEntry[] => [createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date(2026, 9, 1))]

async function mount(apiKey: string | null) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  let added = 0
  await act(async () =>
    root!.render(
      <AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}>
        <PhotoWords db={db} language="fr" vocabulary={own()} onAdded={() => added++} />
      </AiContext.Provider>,
    ),
  )
  return { host, added: () => added }
}
const choose = async (host: HTMLElement) => {
  const input = host.querySelector<HTMLInputElement>('input[type=file]:not([capture])')!
  const file = new File(['x'], 'menu.jpg', { type: 'image/jpeg' })
  Object.defineProperty(input, 'files', { value: [file] })
  await act(async () => void input.dispatchEvent(new Event('change', { bubbles: true })))
  await wait()
}

describe('PhotoWords', () => {
  it('needs a key: says so and cannot pick a photo', async () => {
    const { host } = await mount(null)
    expect(host.textContent).toContain('anahtar')
    expect(host.querySelector<HTMLInputElement>('input[type=file]')!.disabled).toBe(true)
  })

  it('sends the photo with the list, shows the words and adds the chosen ones', async () => {
    const { host, added } = await mount('key')
    await choose(host)
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({ language: 'fr', mediaType: 'image/jpeg', have: ['maison'] })
    expect(requests[0].imageBase64.length).toBeGreaterThan(0)
    expect(host.querySelectorAll('input[type=checkbox]')).toHaveLength(2)
    // Leave "pain" out.
    await act(async () => (host.querySelector('input[aria-label="pain ekle"]') as HTMLInputElement).click())
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Seçilenleri ekle'))!.click())
    await wait()
    expect(((await db.vocabulary.get('fr:fromage')) as VocabularyEntry).senses[0].gloss).toBe('peynir')
    expect(await db.vocabulary.get('fr:pain')).toBeUndefined()
    expect(added()).toBe(1)
    expect(host.textContent).toContain('1 kelime eklendi')
  })

  it('says when the photo had nothing to take', async () => {
    result = []
    const { host } = await mount('key')
    await choose(host)
    expect(host.textContent).toContain('alınacak yeni kelime bulunamadı')
    expect(host.querySelectorAll('input[type=checkbox]')).toHaveLength(0)
  })
})
