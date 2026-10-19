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
  it('renders intro and starts a 10-question round', async () => {
    const host = await mount()
    expect(host.textContent).toContain('İkizler Arenası')
    await click(byText(host, 'tura başla'))
    expect(host.textContent).toContain('1 / 10')
    expect(host.textContent).toContain('İKİZ KELİMELER')
  })

  it('evaluates answers and displays formative distinction rule', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))

    // Find the option buttons
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('.options button')]
    expect(buttons).toHaveLength(2)

    // Click first option
    await click(buttons[0])

    // Should display distinction rule
    expect(host.textContent).toContain('Ayrım Kuralı')
    expect(byText(host, 'Devam et')).toBeDefined()
  })
})
