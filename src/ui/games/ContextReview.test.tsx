// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, scheduler } from '../../data/instance'
import { createEntry } from '../../data/wordInput'
import { newWordState, processAttempt } from '../../engine/review'
import type { UserWordState, VocabularyEntry } from '../../engine/types'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn() } }))
const { ContextReview } = await import('./ContextReview')

let root: ReturnType<typeof createRoot> | undefined
let words: VocabularyEntry[]
let states: UserWordState[]
beforeEach(async () => {
  await db.events.clear()
  await db.meta.put({ key: 'translations', value: [{ text: 'Le chat dort dans le jardin de la maison.', translation: 'Kedi evin bahçesinde uyuyor.', from: 'fr', to: 'tr', at: '2026-10-10T10:00:00Z' }] })
  const long = new Date(Date.now() - 3 * 86_400_000)
  words = [['le chat', 'kedi'], ['le jardin', 'bahçe'], ['la maison', 'ev']].map(([w, m]) => createEntry({ word: w, meaning: m }, 'fr', long))
  states = words.map((e) => processAttempt(newWordState(e, long), { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 2000, hintsUsed: 0, maxHints: 0, at: long }, [], scheduler).state)
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === text || b.textContent?.includes(text))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())

describe('review in context', () => {
  it('blanks the learner\'s words in a translated sentence, takes them back from chips, checks and records each', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    const onChanged = vi.fn()
    await act(async () => root!.render(<ContextReview language="fr" vocabulary={words} states={states} onChanged={onChanged} onExit={() => {}} />))
    await vi.waitFor(() => expect(host.textContent).toContain('1 cümle'))
    await click(byText(host, 'cümlelik tura başla'))
    expect(host.querySelectorAll('.flow-gap')).toHaveLength(3)
    expect(host.textContent).not.toContain('Kedi evin')
    // Wrong order first: jardin into the first blank, then taken back.
    await click(byText(host, 'jardin'))
    await click(host.querySelector('.context-filled'))
    for (const w of ['chat', 'jardin', 'maison']) await click([...host.querySelectorAll('.context-bank button')].find((b) => b.textContent === w))
    await click(byText(host, 'Kontrol et'))
    expect(host.querySelectorAll('.flow-gap.is-correct')).toHaveLength(3)
    expect(host.textContent).toContain('Kedi evin bahçesinde uyuyor.')
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(await db.events.count()).toBe(3)
    await click(byText(host, 'Bitir'))
    expect(host.textContent).toContain('3 / 3 kelime yerinde')
  })

  it('says how sentences gather when there is none yet', async () => {
    await db.meta.put({ key: 'translations', value: [] })
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<ContextReview language="fr" vocabulary={words} states={states} onChanged={() => {}} onExit={() => {}} />))
    await vi.waitFor(() => expect(host.textContent).toContain('Henüz uygun cümle yok'))
  })
})
