// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ComprehensionCard } from './ComprehensionCard'
import { AiContext } from './aiContext'

const ask = vi.fn()
vi.mock('../ai', () => ({
  AiError: class AiError extends Error {},
  comprehensionQuestions: (...a: unknown[]) => ask(...a),
}))
vi.mock('./sounds', () => ({ sfx: { correct: () => {}, wrong: () => {} } }))

const LONG = Array.from({ length: 60 }, (_, i) => `mot${i}`).join(' ')
const questions = [
  { question: 'Birinci?', options: ['A1', 'B1', 'C1', 'D1'], answer: 0, explanation: 'İlk cümlede.' },
  { question: 'İkinci?', options: ['A2', 'B2', 'C2', 'D2'], answer: 0, explanation: 'İkinci cümlede.' },
]

let root: Root
let host: HTMLDivElement
const mount = (apiKey: string | null, text = LONG) => {
  act(() => {
    root.render(
      <AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}>
        <ComprehensionCard text={text} language="fr" />
      </AiContext.Provider>,
    )
  })
}
const flush = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  ask.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('ComprehensionCard', () => {
  it('shows nothing without an AI key or for a very short text', () => {
    mount(null)
    expect(host.textContent).toBe('')
    mount('key', 'bonjour tout le monde')
    expect(host.textContent).toBe('')
  })

  it('asks once, checks each answer locally and gives the verdict', async () => {
    ask.mockResolvedValue(questions)
    mount('key')
    const open = host.querySelector('button')!
    expect(open.textContent).toContain('Okuduğunu sına')
    await act(async () => open.click())
    await flush()
    expect(ask).toHaveBeenCalledTimes(1)
    const sections = host.querySelectorAll('fieldset')
    expect(sections).toHaveLength(2)
    // Answer each question with its right option (the options are shuffled, so find them by text).
    const click = (text: string) => act(() => [...host.querySelectorAll('button')].find((b) => b.textContent === text)!.click())
    click('A1')
    expect(host.textContent).toContain('Doğru. İlk cümlede.')
    const wrong = ['B2', 'C2', 'D2'].find((t) => [...host.querySelectorAll('button')].some((b) => b.textContent === t))!
    click(wrong)
    expect(host.textContent).toContain('Doğrusu başka. İkinci cümlede.')
    expect(host.textContent).toContain("2 sorudan 1'ini bildin")
    expect(host.querySelectorAll('.comprehension-right')).toHaveLength(2)
    expect(host.querySelectorAll('.comprehension-wrong')).toHaveLength(1)
  })

  it('says so when the questions could not be made', async () => {
    ask.mockRejectedValue(new Error('network'))
    mount('key')
    await act(async () => host.querySelector('button')!.click())
    await flush()
    expect(host.textContent).toContain('Sorular hazırlanamadı')
    expect(host.querySelector('button')).not.toBeNull()
  })
})
