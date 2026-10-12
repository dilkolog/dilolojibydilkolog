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

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const { TrueFalseGame } = await import('./TrueFalseGame')
const { PracticeTest } = await import('./PracticeTest')

let root: ReturnType<typeof createRoot> | undefined
let words: VocabularyEntry[]
let states: UserWordState[]
beforeEach(async () => {
  localStorage.clear()
  await db.events.clear()
  const long = new Date(Date.now() - 3 * 86_400_000)
  words = [['maison', 'ev'], ['chat', 'kedi'], ['manger', 'yemek yemek'], ['parler', 'konuşmak'], ['livre', 'kitap'], ['eau', 'su']].map(([w, m]) => createEntry({ word: w, meaning: m }, 'fr', long))
  states = words.map((e) => processAttempt(newWordState(e, long), { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 2000, hintsUsed: 0, maxHints: 0, at: long }, [], scheduler).state)
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))

async function mount(node: React.ReactElement) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(node))
  return host
}

describe('TrueFalseGame', () => {
  it('judges statements, says the real meaning of a wrong one, and ends with a score', async () => {
    const host = await mount(<TrueFalseGame language="fr" vocabulary={words} states={states} onExit={() => {}} onChanged={() => {}} />)
    await click(byText(host, '6 ifadeyle başla') ?? byText(host, 'ifadeyle başla'))
    let answered = 0
    for (let i = 0; i < 6; i++) {
      const word = host.querySelector('.tf-card .swipe-word')!.textContent!
      const shown = host.querySelector('.tf-card .swipe-gloss')!.textContent!
      const entry = words.find((w) => w.lemma === word)!
      const isTrue = entry.senses[0].gloss === shown
      await click(byText(host, isTrue ? 'Doğru' : 'Yanlış'))
      expect(host.querySelector('[role=status]')!.textContent).toBe('Doğru')
      answered++
      await click(byText(host, 'Sonraki') ?? byText(host, 'Sonucu gör'))
    }
    expect(answered).toBe(6)
    await wait()
    expect(host.textContent).toContain('6 / 6')
    expect((await db.events.toArray()).length).toBeGreaterThanOrEqual(6)
  })
})

describe('PracticeTest', () => {
  it('asks the chosen kinds, scores them and offers a new test of the misses', async () => {
    const host = await mount(<PracticeTest language="fr" vocabulary={words} states={states} onExit={() => {}} onChanged={() => {}} />)
    // Only multiple choice.
    for (const k of ['Yazarak', 'Doğru / yanlış', 'Eşleştirme']) await click(byText(host, k))
    await click(byText(host, 'kelimelik sınavı başlat'))
    for (let i = 0; i < 6; i++) {
      const word = host.querySelector('.word')!.textContent!
      const entry = words.find((w) => w.lemma === word)!
      const option = [...host.querySelectorAll<HTMLButtonElement>('.option')].find((o) => o.lastElementChild!.textContent === entry.senses[0].gloss)!
      // The first question is answered wrong on purpose.
      const wrongOne = [...host.querySelectorAll<HTMLButtonElement>('.option')].find((o) => o !== option)!
      await click(i === 0 ? wrongOne : option)
      await click(byText(host, 'Sonraki'))
    }
    await wait()
    expect(host.textContent).toContain('Sınav bitti')
    expect(host.textContent).toContain('5 / 6')
    expect(byText(host, 'Yanlışlarla yeni sınav (1)')).toBeDefined()
    await click(byText(host, 'Yanlışlarla yeni sınav'))
    expect(host.textContent).toContain('1 / 1')
  })

  it('a matching question is worth a point a pair, only for pairs matched on the first try', async () => {
    const host = await mount(<PracticeTest language="fr" vocabulary={words} states={states} onExit={() => {}} onChanged={() => {}} />)
    for (const k of ['Çoktan seçmeli', 'Yazarak', 'Doğru / yanlış']) await click(byText(host, k))
    await click(byText(host, 'kelimelik sınavı başlat'))
    const left = () => [...host.querySelectorAll<HTMLButtonElement>('.test-match-col:first-child .option')]
    const right = () => [...host.querySelectorAll<HTMLButtonElement>('.test-match-col:last-child .option')]
    const glossOf = (lemma: string) => words.find((w) => w.lemma === lemma)!.senses[0].gloss
    // First word: pick a wrong meaning once, then the right one.
    const first = left()[0]
    await click(first)
    await click(right().find((b) => b.textContent !== glossOf(first.textContent!))!)
    for (const w of left()) {
      await click(w)
      await click(right().find((b) => b.textContent === glossOf(w.textContent!) && !b.disabled))
    }
    expect(host.textContent).toContain('3 / 4 ilk denemede')
  })
})
