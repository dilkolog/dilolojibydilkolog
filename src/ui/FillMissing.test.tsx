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

const calls: string[][] = []
const info = (lemma: string, over: Partial<WordInfo> = {}): WordInfo => ({
  input: lemma,
  lemma,
  partOfSpeech: 'noun',
  gender: 'f',
  meanings: ['ev'],
  example: `Voici ma *${lemma}*.`,
  exampleTranslation: 'İşte evim.',
  collocations: [],
  confusables: [],
  frequencyBand: 'top3000',
  literal: '',
  ...over,
})
let fail = false
vi.mock('../ai', async (orig) => ({
  ...(await orig<typeof import('../ai')>()),
  enrichWords: async (_key: string, _lang: string, words: { word: string }[]) => {
    calls.push(words.map((w) => w.word))
    if (fail) throw new (await orig<typeof import('../ai')>()).AiError('budget', 'Bu ayki YZ bütçen doldu.')
    return new Map(words.map((w) => [w.word.toLowerCase(), info(w.word)]))
  },
}))
const { FillMissingBar } = await import('./FillMissing')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  calls.length = 0
  fail = false
  await db.vocabulary.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 80))))
async function mount(vocabulary: VocabularyEntry[], apiKey: string | null = 'key') {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root!.render(
      <AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}>
        <FillMissingBar db={db} vocabulary={vocabulary} onChanged={() => {}} />
      </AiContext.Provider>,
    ),
  )
  return host
}
const bare = (word: string) => ({ ...createEntry({ word, meaning: 'ev', partOfSpeech: 'noun' }, 'fr', new Date(2026, 9, 1)) })

describe('FillMissingBar', () => {
  it('is not there when nothing is missing', async () => {
    const full = bare('maison')
    full.gender = 'f'
    full.senses[0].examples.push({ text: 'Ma maison.', translation: 'Evim.', form: 'maison' })
    expect((await mount([full])).innerHTML).toBe('')
  })

  it('fills the blanks of every word with one tap, in batches, and keeps what the learner wrote', async () => {
    const words = Array.from({ length: 17 }, (_, i) => bare(`mot${i}`))
    await db.vocabulary.bulkPut(words)
    const host = await mount(words)
    expect(host.textContent).toContain('17 kelimede eksik var')
    await act(async () => host.querySelector<HTMLButtonElement>('button.btn')!.click())
    await wait()
    expect(calls.map((c) => c.length)).toEqual([15, 2])
    const stored = (await db.vocabulary.get('fr:mot3')) as VocabularyEntry
    expect(stored.gender).toBe('f')
    expect(stored.article).toBe('la')
    expect(stored.senses[0].examples).toHaveLength(1)
    expect(stored.senses[0].gloss).toBe('ev')
    expect(host.textContent).toContain('17 kelimenin eksikleri tamamlandı')
  })

  it('stops with the reason when the AI is not available, keeping what was done', async () => {
    const words = Array.from({ length: 3 }, (_, i) => bare(`mot${i}`))
    await db.vocabulary.bulkPut(words)
    fail = true
    const host = await mount(words)
    await act(async () => host.querySelector<HTMLButtonElement>('button.btn')!.click())
    await wait()
    expect(host.textContent).toContain('bütçen doldu')
    expect(((await db.vocabulary.get('fr:mot0')) as VocabularyEntry).gender).toBeUndefined()
  })

  it('is disabled without a key, and says why', async () => {
    const host = await mount([bare('maison')], null)
    expect(host.querySelector<HTMLButtonElement>('button.btn')!.disabled).toBe(true)
    expect(host.textContent).toContain('anahtar')
  })
})
