// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Settings } from '../data/db'
import type { WordInfo, WordSuggestRequest } from '../ai'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { VocabularyEntry } from '../engine/types'
import { AiContext } from './aiContext'

const requests: WordSuggestRequest[] = []
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
vi.mock('../ai', async (orig) => ({
  ...(await orig<typeof import('../ai')>()),
  suggestNewWords: async (_key: string, req: WordSuggestRequest) => {
    requests.push(req)
    return [card('voisin', 'komşu'), card('bureau', 'ofis'), card('maison', 'ev')]
  },
}))
const { SuggestWords } = await import('./SuggestWords')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  requests.length = 0
  await db.vocabulary.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))
const own = (n: number, at: Date): VocabularyEntry[] => Array.from({ length: n }, (_, i) => createEntry({ word: i === 0 ? 'maison' : `mot${i}`, meaning: 'x' }, 'fr', at))
const SETTINGS = { newWordsPerDay: 4, profile: { interests: ['yemek'] } } as unknown as Settings

async function mount(vocabulary: VocabularyEntry[], over: { apiKey?: string | null; onlyWhenDue?: boolean } = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  let added = 0
  await act(async () =>
    root!.render(
      <AiContext.Provider value={{ apiKey: over.apiKey === undefined ? 'key' : over.apiKey, setApiKey: async () => {} }}>
        <SuggestWords db={db} language="fr" vocabulary={vocabulary} settings={SETTINGS} onAdded={() => added++} onlyWhenDue={over.onlyWhenDue} />
      </AiContext.Provider>,
    ),
  )
  return { host, added: () => added }
}
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!

describe('SuggestWords on Today', () => {
  it('shows only on a day no word was added, with a key', async () => {
    expect((await mount(own(6, new Date(2026, 9, 1)), { onlyWhenDue: true })).host.textContent).toContain('Bugün yeni kelime eklemedin')
    act(() => root?.unmount())
    expect((await mount(own(6, new Date()), { onlyWhenDue: true })).host.innerHTML).toBe('')
    act(() => root?.unmount())
    expect((await mount(own(6, new Date(2026, 9, 1)), { onlyWhenDue: true, apiKey: null })).host.innerHTML).toBe('')
  })
})

describe('SuggestWords', () => {
  it('asks for the day’s number of words with the interests and the list, and adds the chosen ones, not words already there', async () => {
    const vocabulary = own(6, new Date(2026, 9, 1))
    const { host, added } = await mount(vocabulary)
    await act(async () => button(host, '4 kelime öner').click())
    await wait()
    expect(requests[0]).toMatchObject({ language: 'fr', count: 4, interests: ['yemek'] })
    expect(requests[0].have).toContain('maison')
    expect(host.querySelectorAll('input[type=checkbox]')).toHaveLength(3)
    // Uncheck "bureau"; "maison" is in the list already.
    await act(async () => (host.querySelector('input[aria-label="bureau ekle"]') as HTMLInputElement).click())
    await act(async () => button(host, 'Seçilenleri ekle').click())
    await wait()
    expect(((await db.vocabulary.get('fr:voisin')) as VocabularyEntry).senses[0].gloss).toBe('komşu')
    expect(await db.vocabulary.get('fr:bureau')).toBeUndefined()
    expect(host.textContent).toContain('1 kelime eklendi')
    expect(added()).toBe(1)
  })

  it('is disabled without a key and says why', async () => {
    const { host } = await mount(own(6, new Date(2026, 9, 1)), { apiKey: null })
    expect(button(host, 'kelime öner').disabled).toBe(true)
    expect(host.textContent).toContain('anahtar')
  })
})
