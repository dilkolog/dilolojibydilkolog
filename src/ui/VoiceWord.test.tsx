// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WordInfo } from '../ai'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { VocabularyEntry } from '../engine/types'
import { AiContext } from './aiContext'

const asked: string[] = []
const card = (lemma: string, meaning: string): WordInfo => ({
  input: lemma,
  lemma,
  partOfSpeech: 'noun',
  gender: 'f',
  meanings: [meaning],
  example: `Voici une *${lemma}*.`,
  exampleTranslation: 'İşte.',
  collocations: [],
  confusables: [],
  frequencyBand: 'top3000',
  literal: '',
})
vi.mock('../ai', async (orig) => ({
  ...(await orig<typeof import('../ai')>()),
  enrichWords: async (_k: string, _l: string, words: { word: string }[]) => {
    asked.push(words[0].word)
    return new Map([[words[0].word.toLowerCase(), card('fenêtre', 'pencere')]])
  },
}))
let finalWith: ((alts: string[]) => void) | undefined
vi.mock('./speechInput', () => ({
  canListen: () => true,
  listen: (_l: string, h: { onFinal: (a: string[]) => void; onEnd?: () => void }) => {
    finalWith = (alts) => {
      h.onFinal(alts)
      h.onEnd?.()
    }
    return Object.assign(() => {}, { finish: () => {} })
  },
}))
const { VoiceWord } = await import('./VoiceWord')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  asked.length = 0
  await db.vocabulary.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const own = (): VocabularyEntry[] => [createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date(2026, 9, 1))]

async function mount(apiKey: string | null, vocabulary = own()) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  let added = 0
  await act(async () =>
    root!.render(
      <AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}>
        <VoiceWord db={db} language="fr" vocabulary={vocabulary} onAdded={() => added++} />
      </AiContext.Provider>,
    ),
  )
  return { host, added: () => added }
}

describe('VoiceWord', () => {
  it('needs a key', async () => {
    const { host } = await mount(null)
    expect(host.textContent).toContain('anahtar')
    expect((button(host, 'Söyle') as HTMLButtonElement).disabled).toBe(true)
  })

  it('takes a spoken word, offers the other guesses, prepares the card and adds it on approval', async () => {
    const { host, added } = await mount('key')
    await click(button(host, 'Söyle'))
    await act(async () => finalWith!(['fenêtre.', 'fenetre', 'fait être']))
    expect(host.querySelector<HTMLInputElement>('input')!.value).toBe('fenêtre')
    expect(button(host, 'fenetre')).toBeTruthy()
    await click(button(host, 'Kartı hazırla'))
    await vi.waitFor(() => expect(host.textContent).toContain('pencere'))
    expect(asked).toEqual(['fenêtre'])
    expect(await db.vocabulary.get('fr:fenêtre')).toBeUndefined()
    await click(button(host, 'Ekle'))
    await vi.waitFor(() => expect(host.textContent).toContain('“fenêtre” eklendi'))
    expect(((await db.vocabulary.get('fr:fenêtre')) as VocabularyEntry).senses[0].gloss).toBe('pencere')
    expect(added()).toBe(1)
  })

  it('does not add a word the learner already has', async () => {
    const { host } = await mount('key', [createEntry({ word: 'fenêtre', meaning: 'pencere' }, 'fr', new Date(2026, 9, 1))])
    await click(button(host, 'Söyle'))
    await act(async () => finalWith!(['fenêtre']))
    await click(button(host, 'Kartı hazırla'))
    await vi.waitFor(() => expect(host.textContent).toContain('zaten kelimelerinde var'))
    expect(button(host, 'Ekle')).toBeUndefined()
  })

  it('refuses a whole sentence', async () => {
    const { host } = await mount('key')
    await click(button(host, 'Söyle'))
    await act(async () => finalWith!(['je voudrais un café noir demain matin']))
    expect(host.textContent).toContain('kısa bir kalıp')
    expect(host.querySelector('input')).toBeNull()
  })
})
