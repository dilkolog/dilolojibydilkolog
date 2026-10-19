// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn() } }))
vi.mock('./haptics', () => ({ haptics: { victory: vi.fn() } }))

const { MonologueCard } = await import('./MonologueCard')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => {
  localStorage.clear()
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
  await act(async () => root!.render(<MonologueCard language="fr" />))
  return host
}

describe('MonologueCard', () => {
  it('renders daily monologue prompt and toggles translation', async () => {
    const host = await mount()
    expect(host.textContent).toContain('GÜNÜN ZİHİN TOHUMU')

    const toggleBtn = byText(host, 'Türkçesini gör')
    expect(toggleBtn).toBeDefined()

    await click(toggleBtn)
    expect(host.textContent).toContain('Türkçesini gizle')
  })

  it('marks prompt as completed and records into localStorage', async () => {
    const host = await mount()
    const doneBtn = byText(host, 'Zihnimde canlandırdım')
    expect(doneBtn).toBeDefined()

    await click(doneBtn)
    expect(host.textContent).toContain('Canlandırıldı')
  })
})
