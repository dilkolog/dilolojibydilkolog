// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'
import { reflexPhrases } from '../../data/reflex'

// A short "3 seconds" so the miss can be waited for.
vi.mock('../../engine/reflex', async (orig) => ({ ...(await orig<typeof import('../../engine/reflex')>()), REFLEX_SECONDS: 0.15 }))
vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const { ReflexRound } = await import('./ReflexRound')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('reflex')
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = (ms = 40) => act(async () => void (await new Promise((r) => setTimeout(r, ms))))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<ReflexRound language="fr" onExit={() => {}} />))
  await wait()
  return host
}
const question = (host: HTMLElement) => reflexPhrases.find((p) => p.tr === host.querySelector('.word')?.textContent)!
const option = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>('.option')].find((o) => o.querySelector('.option-serif')?.textContent === text)

describe('ReflexRound', () => {
  it('shows the Turkish with four choices; a quick right answer moves on by itself and is logged', async () => {
    const host = await mount()
    await click(byText(host, 'Süre yok'))
    await click(byText(host, 'tura başla'))
    expect(host.textContent).toContain('1 / 10')
    expect(host.querySelectorAll('.option')).toHaveLength(4)
    const first = question(host)
    await click(option(host, first.fr))
    await wait(800)
    expect(host.textContent).toContain('2 / 10')
    expect((await db.getReflexLog())[first.id]).toMatchObject({ ok: 1, wrong: 0 })
  })

  it('a wrong choice shows the right phrase and waits for Devam', async () => {
    const host = await mount()
    await click(byText(host, 'Süre yok'))
    await click(byText(host, 'tura başla'))
    const first = question(host)
    await click([...host.querySelectorAll<HTMLButtonElement>('.option')].find((o) => o.querySelector('.option-serif')?.textContent !== first.fr))
    expect(host.textContent).toContain('Olmadı.')
    expect(host.querySelector('.cross-warn strong')?.textContent).toBe(first.fr)
    await wait(800)
    expect(host.textContent).toContain('1 / 10')
    await click(byText(host, 'Devam'))
    expect(host.textContent).toContain('2 / 10')
    expect((await db.getReflexLog())[first.id]).toMatchObject({ ok: 0, wrong: 1 })
  })

  it('a slow answer is a miss: the time runs out', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))
    const first = question(host)
    await wait(300)
    expect(host.textContent).toContain('Süre doldu.')
    expect((await db.getReflexLog())[first.id]).toMatchObject({ ok: 0, wrong: 1 })
  })
})
