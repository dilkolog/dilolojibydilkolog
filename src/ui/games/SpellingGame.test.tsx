// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const spoken: string[] = []
vi.mock('../speech', () => ({ canSpeak: () => true, speak: (text: string) => void spoken.push(text), speechPrefs: { rate: 1, voices: {}, varyVoices: false } }))
vi.mock('../../engine/spelling', async (original) => ({ ...(await original<typeof import('../../engine/spelling')>()), spellingRound: () => ['Hélène', 'maison'] }))
const { SpellingGame } = await import('./SpellingGame')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => {
  spoken.length = 0
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
async function type(host: HTMLElement, value: string) {
  const input = host.querySelector<HTMLInputElement>('.answer-input')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const submit = (host: HTMLElement) => act(async () => host.querySelector('form')!.requestSubmit())

describe('SpellingGame', () => {
  it('spells each word aloud; a missing accent is near; the result lists the missed', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<SpellingGame language="fr" lemmas={[]} recordKey="spelling:fr" onExit={() => {}} />))
    expect(host.textContent).toContain('Comment ça s’écrit ?')
    await click(byText(host, 'tura başla'))
    expect(spoken).toEqual(['ache, e accent aigu, elle, e accent grave, enne, e'])
    await type(host, 'Helene')
    await submit(host)
    expect(host.querySelector('.answer-input.is-near')).not.toBeNull()
    await submit(host)
    expect(spoken.at(-1)).toBe('emme, a, i, esse, o, enne')
    await type(host, 'maizon')
    await submit(host)
    expect(host.querySelector('.answer-input.is-wrong')).not.toBeNull()
    await submit(host)
    expect(host.textContent).toContain('1 / 2 doğru')
    expect(host.textContent).toContain('maison')
  })
})
