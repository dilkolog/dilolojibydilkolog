// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'
import { GrammarPractice } from './GrammarPractice'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.mock('../../data/grammar', () => ({ grammarExercises: (language: string) => [
  { id: 'fr-subj-b1', language: 'fr', level: 'B1', topic: 'subjonctif', type: 'choice', prompt: 'Je veux que tu ___ ici.', answer: 'sois', options: ['sois', 'es'], explanation: 'İstek subjonctif gerektirir.', source: 'test' },
  { id: 'fr-subj-c1', language: 'fr', level: 'C1', topic: 'subjonctif', type: 'choice', prompt: 'Bien qu’il ___ tard, il reste.', answer: 'soit', options: ['soit', 'est'], explanation: 'Bien que subjonctif gerektirir.', source: 'test' },
  { id: 'fr-present-a1', language: 'fr', level: 'A1', topic: 'basics_fr_present', type: 'choice', prompt: 'Je ___ ici.', answer: 'suis', options: ['suis', 'es'], explanation: 'Je ile suis kullanılır.', source: 'test' },
  { id: 'es-subj-b1', language: 'es', level: 'B1', topic: 'subjuntivo', type: 'choice', prompt: 'Quiero que ___ aquí.', answer: 'estés', options: ['estés', 'estás'], explanation: 'İstek subjuntivo gerektirir.', source: 'test' },
].filter((e) => e.language === language) }))
vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), finish: vi.fn() } }))

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
beforeEach(async () => {
  await db.meta.delete('grammar')
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); document.body.innerHTML = '' })
const click = async (text: string) => {
  const button = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
  expect(button, text).toBeDefined()
  await act(async () => button!.click())
}
const change = async (selector: string, value: string) => {
  const element = host.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(element.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLSelectElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event(element.tagName === 'INPUT' ? 'input' : 'change', { bubbles: true }))
  })
}
async function mount(language: 'fr' | 'es' = 'fr', initialTopic?: string) {
  await act(async () => root.render(<GrammarPractice language={language} onExit={() => {}} initialTopic={initialTopic} />))
  await act(async () => new Promise((r) => setTimeout(r, 40)))
}

describe('grammar directory navigation', () => {
  it('opens an empty topic honestly without starting an unrelated round', async () => {
    await mount()
    expect(host.querySelectorAll('.grammar-category')).toHaveLength(16)
    await click('İsimler ve artikeller')
    await click('İsimlerde düzensiz çoğul')
    expect(host.querySelector('.grammar-selection')?.textContent).toContain('Alıştırmalar henüz eklenmedi')
    expect(host.querySelector('.grammar-selection button')).toBeNull()
    await click('Seçimi temizle')
    expect(host.querySelector('.grammar-selection')?.textContent).toContain('3 soruluk tura başla')
  })

  it('searches empty topics, filters ready ones, and limits the real round to the selected level and category', async () => {
    await mount()
    await change('input[type="search"]', 'subjonctif')
    expect(host.querySelectorAll('.grammar-topic').length).toBeGreaterThan(1)
    await change('select', 'B2-C1')
    const availability = host.querySelectorAll('select')[1]
    await act(async () => { availability.value = 'ready'; availability.dispatchEvent(new Event('change', { bubbles: true })) })
    expect(host.querySelectorAll('.grammar-topic')).toHaveLength(1)
    await click('Subjonctif: karma alıştırmalar')
    await click('1 soruluk tura başla')
    expect(host.querySelector('.prompt-label')?.textContent).toContain('C1')
    expect(host.querySelector('.grammar-sentence')?.textContent).toContain('Bien qu’il')
  })

  it('opens a guide topic directly and clears language-specific selections on language change', async () => {
    await mount('fr', 'subjonctif')
    expect(host.querySelector('.grammar-selection')?.textContent).toContain('Subjonctif: karma alıştırmalar')
    expect(host.querySelectorAll('.grammar-topic').length).toBeGreaterThan(0)
    await change('input[type="search"]', 'etre')
    await mount('es')
    expect(host.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('')
    expect(host.querySelectorAll('.grammar-category')).toHaveLength(16)
    expect(host.querySelector('.grammar-selection')?.textContent).toContain('1 soruluk tura başla')
  })
})
