// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const { ConfusablesGame } = await import('./ConfusablesGame')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('records')
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
  await act(async () => root!.render(<ConfusablesGame language="en" recordKey="confusables:en" onExit={() => {}} />))
  await wait()
  return host
}

describe('ConfusablesGame', () => {
  it('renders the intro and starts a 10-question round of sentences', async () => {
    const host = await mount()
    expect(host.textContent).toContain('İkizler Arenası')
    await click(byText(host, 'tura başla'))
    expect(host.textContent).toContain('1 / 10')
    expect(host.querySelectorAll('.options .option')).toHaveLength(2)
  })

  it('an answer shows the rule, and a sentence its Turkish; Enter goes on', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))
    await click(host.querySelector('.options .option'))
    const status = host.querySelector('[role="status"]')!
    expect(status.textContent).toMatch(/Doğru|Doğrusu/)
    expect(host.querySelector('.option.is-correct')).not.toBeNull()
    await act(async () => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })))
    expect(host.textContent).toContain('2 / 10')
  })

  it('one pair can be practised alone', async () => {
    const host = await mount()
    await click(byText(host, 'say / tell'))
    await click(byText(host, 'tura başla'))
    for (let i = 0; i < 3; i++) {
      expect(host.querySelector('.prompt-label')!.textContent).toContain('say / tell')
      await act(async () => void window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' })))
      await act(async () => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })))
    }
  })
})
