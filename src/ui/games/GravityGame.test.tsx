// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
// A frame loop sets state on every frame, so this test lets React update on its own instead of inside act().
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = false
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, scheduler } from '../../data/instance'
import { createEntry } from '../../data/wordInput'
import { newWordState, processAttempt } from '../../engine/review'
import type { UserWordState, VocabularyEntry } from '../../engine/types'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const { GravityGame } = await import('./GravityGame')

let root: ReturnType<typeof createRoot> | undefined
let words: VocabularyEntry[]
let states: UserWordState[]
beforeEach(async () => {
  localStorage.clear()
  await db.events.clear()
  const long = new Date(Date.now() - 3 * 86_400_000)
  words = [['maison', 'ev'], ['chat', 'kedi'], ['manger', 'yemek yemek'], ['parler', 'konuşmak']].map(([w, m]) => createEntry({ word: w, meaning: m }, 'fr', long))
  states = words.map((e) => processAttempt(newWordState(e, long), { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 2000, hintsUsed: 0, maxHints: 0, at: long }, [], scheduler).state)
})
afterEach(() => {
  root?.unmount()
  document.body.innerHTML = ''
})

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
async function type(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await wait(60)
}

describe('GravityGame', () => {
  it('a meaning falls; typing its word (no accents or article needed) scores and clears it', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    root.render(<GravityGame language="fr" vocabulary={words} states={states} onExit={() => {}} onChanged={() => {}} />)
    await wait(80)
    byText(host, 'kelimeyle başla')!.click()
    await wait(900)
    const drop = host.querySelector('.gravity-drop')!
    const entry = words.find((w) => w.senses[0].gloss === drop.textContent)!
    expect(entry).toBeDefined()
    await type(host.querySelector('input')!, entry.lemma.toUpperCase())
    expect(host.querySelectorAll('.gravity-drop')).toHaveLength(0)
    expect(host.textContent).toMatch(/[1-9]\d* puan/)
    expect((host.querySelector('input') as HTMLInputElement).value).toBe('')
    await vi.waitFor(async () => expect((await db.events.toArray()).length).toBe(1))
  })
})
