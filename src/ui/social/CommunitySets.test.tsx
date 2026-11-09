// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommunitySets } from './CommunitySets'

const ITEMS = [
  { id: 'a'.repeat(32), name: 'Mutfak', language: 'fr', count: 12, by: 'ali', at: '2026-10-20T10:00:00Z' },
  { id: 'b'.repeat(32), name: 'Kötü liste', language: 'fr', count: 3, at: '2026-10-21T10:00:00Z' },
]

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  localStorage.clear()
})

async function until(done: () => boolean, ms = 3000) {
  const end = Date.now() + ms
  while (!done() && Date.now() < end) await act(() => new Promise((r) => setTimeout(r, 10)))
}

async function mount() {
  const calls: unknown[] = []
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (init?.body) calls.push(JSON.parse(String(init.body)))
    if (String(url).includes('library=1')) return Response.json({ items: ITEMS })
    return Response.json({ ok: true })
  })
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<CommunitySets language="fr" onAdded={() => {}} />))
  const details = host.querySelector('details')!
  await act(async () => {
    details.open = true
    details.dispatchEvent(new Event('toggle'))
  })
  await until(() => host.querySelectorAll('li').length > 0)
  return { host, calls }
}

const names = (host: HTMLElement) => [...host.querySelectorAll('li strong')].map((s) => s.textContent)

describe('CommunitySets', () => {
  it('a list is reported from its row, then is not shown on this device again', async () => {
    const { host, calls } = await mount()
    expect(names(host)).toEqual(['Mutfak', 'Kötü liste'])
    await act(async () => (host.querySelector('button[aria-label="“Kötü liste” listesini şikâyet et"]') as HTMLButtonElement).click())
    await until(() => !!host.querySelector('.report-dialog'))
    // A list has no person to block with it.
    expect(host.querySelector('.report-block')).toBeNull()
    await act(async () => ([...host.querySelectorAll('[role="radio"]')].find((b) => b.textContent?.startsWith('Cinsel')) as HTMLButtonElement).click())
    await act(async () => ([...host.querySelectorAll('.report-dialog button')].find((b) => b.textContent === 'Şikâyet et') as HTMLButtonElement).click())
    await until(() => names(host).length === 1)
    expect(calls).toContainEqual(expect.objectContaining({ action: 'report', kind: 'set', target: 'b'.repeat(32), reason: 'sexual' }))
    expect(names(host)).toEqual(['Mutfak'])

    act(() => root?.unmount())
    document.body.innerHTML = ''
    const again = await mount()
    expect(names(again.host)).toEqual(['Mutfak'])
  })
})
