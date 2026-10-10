// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'
import { trapWords } from '../../data/traps'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const { TrapRound } = await import('./TrapRound')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('traps')
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
  await act(async () => root!.render(<TrapRound language="fr" onExit={() => {}} />))
  await wait()
  return host
}
const current = (host: HTMLElement) => trapWords.find((t) => t.language === 'fr' && t.text === host.querySelector('.grammar-sentence')?.textContent)!

describe('TrapRound', () => {
  it('asks the meaning of a word in its sentence; the right option is logged and explained', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))
    expect(host.textContent).toContain('1 / 8')
    const w = current(host)
    expect(host.querySelectorAll('.option')).toHaveLength(3)
    await click([...host.querySelectorAll<HTMLButtonElement>('.option')].find((o) => o.querySelector('.option-serif')?.textContent === w.meaning))
    expect(host.textContent).toContain(`“${w.looks}” gibi görünür`)
    expect(host.textContent).toContain(w.tr)
    expect((await db.getTrapLog())[w.id]).toMatchObject({ ok: 1, wrong: 0 })
  })

  it('falling for the trap is logged as a miss and listed at the end', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))
    for (let i = 0; i < 8; i++) {
      const w = current(host)
      await click([...host.querySelectorAll<HTMLButtonElement>('.option')].find((o) => o.querySelector('.option-serif')?.textContent === w.trap))
      await click(byText(host, 'Devam'))
    }
    await wait()
    expect(host.textContent).toContain('0 / 8 doğru')
    expect(Object.values(await db.getTrapLog()).every((r) => r.wrong === 1)).toBe(true)
  })
})
