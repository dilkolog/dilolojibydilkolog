// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NumberQuestion } from '../../engine/numbers'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const spoken: string[] = []
vi.mock('../speech', () => ({ canSpeak: () => true, speak: (text: string) => void spoken.push(text), speechPrefs: { rate: 1, voices: {}, varyVoices: false } }))
// A known round: a number and a time in French.
const ROUND: NumberQuestion[] = [
  { kind: 'small', value: 97, spoken: 'quatre-vingt-dix-sept', digits: '97', written: ['quatre-vingt-dix-sept'] },
  { kind: 'time', value: 14 * 60 + 30, spoken: 'Il est quatorze heures trente.', digits: '14h30', written: ['Il est quatorze heures trente.'] },
]
vi.mock('../../engine/numbers', async (original) => ({ ...(await original<typeof import('../../engine/numbers')>()), numberRound: () => ROUND }))
const { NumbersGame } = await import('./NumbersGame')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => {
  spoken.length = 0
  localStorage.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 30))))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
async function type(host: HTMLElement, value: string) {
  const input = host.querySelector<HTMLInputElement>('.answer-input')!
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const submit = (host: HTMLElement) => act(async () => host.querySelector('form')!.requestSubmit())

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<NumbersGame language="fr" recordKey="numbers:fr" onExit={() => {}} />))
  await wait()
  return host
}

describe('NumbersGame', () => {
  it('listening: the number is said, the digits typed are checked, the words shown after', async () => {
    const host = await mount()
    expect(host.textContent).toContain('quatre-vingts')
    await click(byText(host, 'tura başla'))
    expect(spoken).toEqual(['quatre-vingt-dix-sept'])
    await type(host, '87')
    await submit(host)
    expect(host.querySelector('.answer-input.is-wrong')).not.toBeNull()
    expect(host.querySelector('.numbers-answer')!.textContent).toContain('97 = quatre-vingt-dix-sept')
    await submit(host)
    // A time: "14h30", "14:30" and "14 h 30" are all read.
    expect(host.textContent).toContain('saati rakamla')
    await type(host, '14:30')
    await submit(host)
    expect(host.querySelector('.answer-input.is-correct')).not.toBeNull()
    await submit(host)
    expect(host.textContent).toContain('1 / 2 doğru')
    expect(host.textContent).toContain('97 = quatre-vingt-dix-sept')
  })

  it('writing: the digits are shown and the words checked; a missing plural s is near; the choice is kept', async () => {
    const host = await mount()
    await click(byText(host, 'Gör ve yaz'))
    // A time cannot be asked in words.
    expect(byText(host, 'Saatler')!.disabled).toBe(true)
    await click(byText(host, 'tura başla'))
    expect(spoken).toEqual([])
    expect(host.querySelector('.numbers-digits')!.textContent).toBe('97')
    await type(host, 'quatre vingt dix sept')
    await submit(host)
    expect(host.querySelector('.answer-input.is-correct')).not.toBeNull()
    expect(JSON.parse(localStorage.getItem('diloloji:numbers')!)).toMatchObject({ mode: 'write' })
  })
})
