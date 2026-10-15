// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scheduler } from '../../data/instance'
import { createEntry } from '../../data/wordInput'
import { newWordState, processAttempt } from '../../engine/review'
import type { UserWordState, VocabularyEntry } from '../../engine/types'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
vi.mock('../speech', () => ({ playWord: vi.fn() }))
const { SwipeCards } = await import('./SwipeCards')

let root: ReturnType<typeof createRoot> | undefined
let words: VocabularyEntry[]
let states: UserWordState[]
beforeEach(() => {
  localStorage.clear()
  const long = new Date(Date.now() - 3 * 86_400_000)
  words = [['maison', 'ev'], ['chat', 'kedi'], ['manger', 'yemek yemek'], ['parler', 'konuşmak']].map(([w, m]) => createEntry({ word: w, meaning: m }, 'fr', long))
  states = words.map((e) => processAttempt(newWordState(e, long), { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 2000, hintsUsed: 0, maxHints: 0, at: long }, [], scheduler).state)
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<SwipeCards language="fr" vocabulary={words} states={states} onExit={() => {}} onChanged={() => {}} />))
  return host
}

describe('SwipeCards study options', () => {
  it('says how many words each set has and starts with the chosen number of cards', async () => {
    const host = await mount()
    expect(byText(host, 'Öğrendiklerimin hepsi')?.textContent).toContain('4')
    expect(byText(host, 'Zor işaretliler')?.disabled).toBe(true)
    await click(byText(host, '10 kart'))
    expect(byText(host, 'kartla başla')?.textContent).toContain('4 kartla')
  })

  it('word first shows the word, meaning first shows the meaning and keeps the word on the back', async () => {
    const forward = await mount()
    await click(byText(forward, 'kartla başla'))
    const front = forward.querySelector('.swipe-word')!.textContent!
    expect(words.map((w) => w.lemma)).toContain(front)
    act(() => root?.unmount())
    document.body.innerHTML = ''

    const reverse = await mount()
    await click(byText(reverse, 'Anlam önce'))
    await click(byText(reverse, 'kartla başla'))
    const meaning = reverse.querySelector('.swipe-word')!.textContent!
    const entry = words.find((w) => w.senses[0].gloss === meaning)!
    expect(entry).toBeDefined()
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })))
    expect(reverse.querySelector('.swipe-gloss')!.textContent).toBe(entry.lemma)
  })

  it('remembers the choice for next time', async () => {
    const host = await mount()
    await click(byText(host, 'Karıştır'))
    await click(byText(host, 'Karışık'))
    act(() => root?.unmount())
    document.body.innerHTML = ''
    const again = await mount()
    expect(byText(again, 'Karıştır')?.getAttribute('aria-pressed')).toBe('true')
    expect(byText(again, 'Karışık')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('a card not known stays in the round and counts as still learning; known ones leave', async () => {
    const host = await mount()
    await click(byText(host, 'kartla başla'))
    const key = (k: string, code = '') => act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code })))
    await key(' ', 'Space')
    await key('1')
    await act(() => new Promise((r) => setTimeout(r, 260)))
    expect(host.querySelector('.flash-learning')!.textContent).toBe('Öğreniliyor 1')
    expect(host.textContent).toContain('Kalan 4')
    await key(' ', 'Space')
    await key('3')
    await act(() => new Promise((r) => setTimeout(r, 260)))
    expect(host.querySelector('.flash-known')!.textContent).toBe('Biliniyor 1')
    expect(host.textContent).toContain('Kalan 3')
  })

  it('written: the meaning shows, the typed word is checked', async () => {
    const host = await mount()
    await click(byText(host, 'Yazarak'))
    await click(byText(host, 'kartla başla'))
    const meaning = host.querySelector('.swipe-word')!.textContent!
    const entry = words.find((w) => w.senses[0].gloss === meaning)!
    const field = host.querySelector<HTMLInputElement>('input.answer-input')!
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      set.call(field, entry.lemma)
      field.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => host.querySelector('form')!.requestSubmit())
    expect(host.querySelector('.flash-verdict')!.textContent).toBe('Doğru')
  })
})

