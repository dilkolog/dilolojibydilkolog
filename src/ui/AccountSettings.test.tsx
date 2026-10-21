// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  meta: new Map<string, unknown>(),
  runSync: vi.fn(async (): Promise<unknown> => ({ skipped: 0 })),
  handle: { handle: '', findable: false },
  saveHandle: vi.fn(async (handle: string, findable: boolean) => ({ handle, findable })),
}))
vi.mock('../data/instance', () => ({ db: { meta: { get: async (key: string) => (state.meta.has(key) ? { value: state.meta.get(key) } : undefined) } } }))
vi.mock('../data/supabase', () => ({ currentIdentity: async () => null, signInWithGoogle: async () => undefined, supabaseConfigured: () => true }))
vi.mock('./syncRunner', async () => {
  const real = await vi.importActual<typeof import('./syncRunner')>('./syncRunner')
  return { ...real, getAccount: async () => ({ kind: 'account', username: 'ali', id: 'a', enc: 'b', auth: 'c' }), runSync: state.runSync }
})
vi.mock('./accessContext', () => ({ useAccess: () => ({ status: 'approved', approved: true }) }))
vi.mock('./AccountManage', () => ({ AccountManage: () => null, AccountDelete: () => null }))
vi.mock('../data/friends', async () => {
  const real = await vi.importActual<typeof import('../data/friends')>('../data/friends')
  return { ...real, loadHandle: async () => state.handle, saveHandle: state.saveHandle }
})
vi.mock('./pendingHandle', () => ({ pendingHandle: () => null }))
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
  state.saveHandle.mockClear()
  state.handle = { handle: '', findable: false }
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
})

describe('AccountSettings sync', () => {
  it('has no sync box, no sync button and no history: syncing runs by itself', async () => {
    state.meta.set('syncAt', new Date().toISOString())
    await mount()
    expect(host.textContent).not.toContain('Verilerin hesabında')
    expect([...host.querySelectorAll('button')].some((b) => b.textContent === 'Şimdi eşitle')).toBe(false)
    expect(host.textContent).not.toContain('Geçmiş')
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

})

describe('AccountSettings @name', () => {
  it('shows a chosen @name beside the name, and no form', async () => {
    state.handle = { handle: 'ali_tr', findable: true }
    await mount()
    const tag = host.querySelector('.account-who-header .account-handle')
    expect(tag?.textContent).toBe('@ali_tr')
    expect(host.querySelector('.account-handle-form')).toBeNull()
  })

  it('offers a form when there is no @name yet, and saves a valid one as findable', async () => {
    await mount()
    expect(host.querySelector('.account-handle')).toBeNull()
    const input = host.querySelector('.account-handle-form input') as HTMLInputElement
    const save = [...host.querySelectorAll('.account-handle-form button')].find((b) => b.textContent === 'Kaydet') as HTMLButtonElement
    expect(save.disabled).toBe(true)
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      set.call(input, '@Ali_TR')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(save.disabled).toBe(false)
    await act(async () => save.click())
    expect(state.saveHandle).toHaveBeenCalledWith('ali_tr', true)
    expect(host.querySelector('.account-who-header .account-handle')?.textContent).toBe('@ali_tr')
    expect(host.querySelector('.account-handle-form')).toBeNull()
  })
})
