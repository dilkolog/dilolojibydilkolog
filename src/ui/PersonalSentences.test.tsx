// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KelimeDB } from '../data/db'
import { createEntry } from '../data/wordInput'
import { AiContext } from './aiContext'
import { interestsOf } from './personalInterests'

const asked = vi.fn(async (_key: string, _req: unknown) => [
  { text: 'Je *regarde* un match de foot ce soir.', translation: 'Bu akşam bir futbol maçı izliyorum.' },
  { text: 'Mon frère *regarde* toujours des séries.', translation: 'Kardeşim hep dizi izler.' },
])
vi.mock('../ai', () => ({ personalSentences: (k: string, r: unknown) => asked(k, r), AiError: class extends Error {} }))
const { PersonalSentences } = await import('./PersonalSentences')

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  asked.mockClear()
})

const mount = async (apiKey: string | null, db: KelimeDB, entry: ReturnType<typeof createEntry>) => {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const changed = vi.fn()
  await act(async () => root!.render(<AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}><PersonalSentences db={db} entry={entry} onChanged={changed} /></AiContext.Provider>))
  return { host, changed }
}
// IndexedDB answers on later ticks: give them time before looking.
const click = async (el: Element | null | undefined) =>
  act(async () => {
    ;(el as HTMLElement).click()
    await new Promise((r) => setTimeout(r, 60))
  })
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

describe('interestsOf', () => {
  it('joins the profile chips and the story topics without repeats, trimmed and capped', () => {
    expect(interestsOf({ profile: { interests: ['futbol', ' müzik '] }, story: { interests: ['müzik', 'seyahat'], custom: 'bahçecilik' } })).toEqual(['futbol', 'müzik', 'seyahat', 'bahçecilik'])
    expect(interestsOf(undefined)).toEqual([])
    expect(interestsOf({ profile: { interests: Array.from({ length: 12 }, (_, i) => `k${i}`) } })).toHaveLength(8)
  })
})

describe('PersonalSentences', () => {
  it('shows nothing without an AI key', async () => {
    const db = new KelimeDB('t-ps-nokey')
    expect((await mount(null, db, createEntry({ word: 'regarder', meaning: 'bakmak' }, 'fr', new Date()))).host.innerHTML).toBe('')
  })

  it('asks with the learner\'s interests and adds only the sentence taken', async () => {
    const db = new KelimeDB('t-ps-ask')
    await db.saveSettings({ ...(((await db.getSettings()) ?? {}) as object), profile: { interests: ['futbol'] } } as never)
    const entry = createEntry({ word: 'regarder', meaning: 'bakmak' }, 'fr', new Date())
    await db.vocabulary.put(entry)
    const { host, changed } = await mount('key', db, entry)
    await click(button(host, 'Bana özel cümleler'))
    expect(asked).toHaveBeenCalledTimes(1)
    expect(asked.mock.calls[0][1]).toMatchObject({ language: 'fr', word: 'regarder', meaning: 'bakmak', interests: ['futbol'] })
    expect(host.textContent).toContain('Je regarde un match de foot ce soir.')
    expect(host.textContent).toContain('futbol')
    // Nothing is added unasked.
    expect((await db.vocabulary.get(entry.id))!.senses[0].examples.map((e) => e.text)).not.toContain('Je regarde un match de foot ce soir.')
    await click(button(host, 'Ekle'))
    const saved = (await db.vocabulary.get(entry.id))!.senses[0].examples
    expect(saved.find((e) => e.text === 'Je regarde un match de foot ce soir.')).toMatchObject({ form: 'regarde', translation: 'Bu akşam bir futbol maçı izliyorum.' })
    expect(changed).toHaveBeenCalled()
    // The taken one leaves the list, the other stays.
    expect(host.textContent).not.toContain('Je regarde un match')
    expect(host.textContent).toContain('Mon frère regarde toujours des séries.')
  })

  it('says so when there are no interests, and is hidden once the word has the most examples', async () => {
    const db = new KelimeDB('t-ps-none')
    const entry = createEntry({ word: 'regarder', meaning: 'bakmak' }, 'fr', new Date())
    const { host } = await mount('key', db, entry)
    await click(button(host, 'Bana özel cümleler'))
    expect(host.textContent).toContain('ilgi alanı yok')
    act(() => root?.unmount())
    const full = { ...entry, senses: [{ ...entry.senses[0], examples: Array.from({ length: 8 }, (_, i) => ({ text: `Phrase ${i} regarde`, translation: '', form: 'regarde' })) }] }
    expect((await mount('key', db, full)).host.innerHTML).toBe('')
  })
})
