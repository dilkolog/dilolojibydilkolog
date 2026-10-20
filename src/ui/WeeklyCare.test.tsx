// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./loadBlindSpots', () => ({
  loadBlindSpots: async () => [{ id: 'error:accent', title: 'Aksanlarda en çok takılıyorsun', detail: '', target: 'accent', action: 'Aksan antrenmanı', score: 1 }],
}))
const { WeeklyCare } = await import('./WeeklyCare')

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
})

async function mount(now: Date, misses = 5) {
  const calls: string[] = []
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<WeeklyCare language="fr" misses={misses} events={[]} now={now} onWords={() => calls.push('words')} onGrammar={() => calls.push('grammar')} onRepair={(t) => calls.push(`repair:${t}`)} />))
  for (let i = 0; i < 20 && !host.querySelector('.weekly-care'); i++) await act(() => new Promise((r) => setTimeout(r, 25)))
  return { host, calls }
}

describe('WeeklyCare', () => {
  it('on a Saturday it opens the steps one by one, ticks them and is gone when all are done', async () => {
    const { host, calls } = await mount(new Date(2026, 9, 17, 10))
    expect(host.querySelector('.weekly-care')!.textContent).toContain('Bu haftaki yanlış kelimeler')
    expect(host.querySelectorAll('.care-step')).toHaveLength(2)
    await act(async () => host.querySelector<HTMLButtonElement>('.habit-nudge-main')!.click())
    expect(calls).toEqual(['words'])
    expect(host.querySelector('.care-step.done')!.textContent).toContain('Bu haftaki yanlış kelimeler')
    expect(host.querySelector('.weekly-care')!.textContent).toContain('Aksan antrenmanı')
    await act(async () => host.querySelector<HTMLButtonElement>('.habit-nudge-main')!.click())
    expect(calls).toEqual(['words', 'repair:accent'])
    expect(host.querySelector('.weekly-care')).toBeNull()
  })

  it('is silent on weekdays, with too little behind it, and after "not this week"', async () => {
    expect((await mount(new Date(2026, 9, 14, 10))).host.querySelector('.weekly-care')).toBeNull()
    act(() => root?.unmount())
    // One step only (3 misses missing, the spot there): not a round.
    expect((await mount(new Date(2026, 9, 17, 10), 1)).host.querySelector('.weekly-care')).toBeNull()
    act(() => root?.unmount())
    const { host } = await mount(new Date(2026, 9, 17, 10))
    await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Bu hafta değil"]')!.click())
    expect(host.querySelector('.weekly-care')).toBeNull()
    act(() => root?.unmount())
    expect((await mount(new Date(2026, 9, 18, 10))).host.querySelector('.weekly-care')).toBeNull()
  })
})
