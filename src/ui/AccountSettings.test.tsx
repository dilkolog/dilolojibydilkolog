// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ meta: new Map<string, unknown>(), runSync: vi.fn(async (): Promise<unknown> => ({ skipped: 0 })) }))
vi.mock('../data/instance', () => ({ db: { meta: { get: async (key: string) => (state.meta.has(key) ? { value: state.meta.get(key) } : undefined) } } }))
vi.mock('../data/supabase', () => ({ currentIdentity: async () => null, signInWithGoogle: async () => undefined, supabaseConfigured: () => true }))
vi.mock('./syncRunner', async () => {
  const real = await vi.importActual<typeof import('./syncRunner')>('./syncRunner')
  return { ...real, getAccount: async () => ({ kind: 'account', username: 'ali', id: 'a', enc: 'b', auth: 'c' }), runSync: state.runSync }
})
vi.mock('./accessContext', () => ({ useAccess: () => ({ status: 'approved', approved: true }) }))
vi.mock('./AccountManage', () => ({ AccountManage: () => null, AccountDelete: () => null }))
vi.mock('./RestorePoints', () => ({ RestorePoints: () => null }))
vi.mock('./toastFeed', () => ({ showToast: () => undefined }))

const { AccountSettings } = await import('./AccountSettings')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
let host: HTMLElement
const mount = async () => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<AccountSettings />))
  await act(() => new Promise((r) => setTimeout(r, 0)))
}

beforeEach(() => {
  state.meta.clear()
  state.runSync.mockClear()
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
})

describe('AccountSettings sync', () => {
  it('says the data is in the account, with when it last synced, and a quiet way to sync now', async () => {
    state.meta.set('syncAt', new Date().toISOString())
    await mount()
    expect(host.textContent).toContain('Verilerin hesabında')
    expect(host.textContent).toContain('Değişiklikler kendiliğinden gider')
    const now = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Şimdi eşitle') as HTMLButtonElement
    expect(now.className).toContain('link')
    await act(async () => now.click())
    expect(state.runSync).toHaveBeenCalledWith(true)
  })

  it('warns when the synced data nears the server limit, and not before', async () => {
    state.meta.set('syncSize', 1_000_000)
    await mount()
    expect(host.textContent).not.toContain('sınırına yaklaşıyor')
    act(() => root?.unmount())
    document.body.innerHTML = ''
    state.meta.set('syncSize', 4_000_000)
    await mount()
    expect(host.textContent).toContain('sınırına yaklaşıyor')
  })

  it('keeps saying what the last sync left behind, even when it ran in the background', async () => {
    state.meta.set('syncSkipped', 3)
    await mount()
    expect(host.textContent).toContain('3 görsel/ses kaydı eşitlenemedi')
  })

  it('names the pictures and recordings a sync could not take along', async () => {
    state.runSync.mockResolvedValueOnce({ skipped: 2 })
    await mount()
    await act(async () => ([...host.querySelectorAll('button')].find((b) => b.textContent === 'Şimdi eşitle') as HTMLButtonElement).click())
    expect(host.querySelector('[role=status].error, p.error')?.textContent).toContain('2 görsel/ses kaydı eşitlenemedi')
  })
})
