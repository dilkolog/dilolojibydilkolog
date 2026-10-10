// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GrammarExercise } from '../../engine/grammar'
import { db } from '../../data/instance'

const base = { language: 'en', level: 'C1', topic: 'inversion', source: 'test' } as const
const EXERCISES: GrammarExercise[] = [
  { ...base, id: 'en-t-01', type: 'cloze', prompt: 'Never ___ (see) I such a sunset.', answer: 'have', explanation: 'Never başa gelince devrik yapı.' },
  { ...base, id: 'en-t-02', type: 'choice', prompt: 'Rarely ___ such dedication.', answer: 'do we see', options: ['we see', 'do we see'], explanation: 'Rarely başa gelince yardımcı fiil.' },
  { ...base, id: 'en-t-03', type: 'error', prompt: 'No sooner had he left when it rained.', answer: 'when', fix: 'than', explanation: 'No sooner … than.' },
]
vi.mock('../../data/grammar', () => ({ grammarExercises: () => EXERCISES }))
vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn() } }))
const { GrammarPractice } = await import('./GrammarPractice')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('grammar')
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<GrammarPractice language="en" onExit={() => {}} />))
  await wait()
  return host
}

/** Answers the question on screen: right, or deliberately wrong. */
async function answer(host: HTMLElement, right: boolean) {
  const words = host.querySelectorAll<HTMLButtonElement>('.grammar-word')
  if (words.length) {
    const target = [...words].find((w) => (w.textContent === 'when') === right)
    return click(target)
  }
  const options = host.querySelectorAll<HTMLButtonElement>('.option')
  if (options.length) return click([...options].find((o) => (o.textContent?.includes('do we see') ?? false) === right))
  const input = host.querySelector<HTMLInputElement>('input.answer-input')!
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    set.call(input, right ? 'have' : 'did')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await click(byText(host, 'Kontrol et'))
}

describe('GrammarPractice', () => {
  it('goes through a round of the three kinds, showing the rule after each answer, and keeps the log', async () => {
    const host = await mount()
    expect(host.textContent).toContain('3 soruluk tura başla')
    await click(byText(host, 'tura başla'))
    for (let i = 0; i < 3; i++) {
      expect(host.textContent).toContain(`${i + 1} / 3`)
      await answer(host, true)
      expect(host.textContent).toContain('Doğru!')
      expect(host.textContent).toMatch(/devrik|yardımcı|than/)
      await click(byText(host, 'Devam'))
    }
    await wait()
    expect(host.textContent).toContain('3 / 3 doğru')
    const log = await db.getGrammarLog()
    expect(Object.keys(log).sort()).toEqual(['en-t-01', 'en-t-02', 'en-t-03'])
    expect(Object.values(log).every((r) => r.ok === 1 && r.wrong === 0)).toBe(true)
  })

  it('says what was wrong, gives the right word, and logs the miss', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))
    await answer(host, false)
    expect(host.textContent).toContain('Olmadı.')
    const log = await db.getGrammarLog()
    expect(Object.values(log).filter((r) => r.wrong === 1)).toHaveLength(1)
    // Finish the round: the miss is listed at the end.
    for (let i = 0; i < 2; i++) {
      await click(byText(host, 'Devam'))
      await answer(host, true)
    }
    await click(byText(host, 'Devam'))
    await wait()
    expect(host.textContent).toContain('2 / 3 doğru')
  })
})
