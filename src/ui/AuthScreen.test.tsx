// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ACCOUNT = { kind: 'account', username: 'ali', id: 'a'.repeat(64), enc: 'e'.repeat(64), auth: '1'.repeat(64) }
let probe = { status: 'none', exists: false, match: false }
const requestAccess = vi.fn(async () => 'pending')
const setAccount = vi.fn(async () => {})
const runSync = vi.fn(async () => null as unknown)
const toast = vi.fn()

vi.mock('../data/access', () => ({ probeAccount: async () => probe, requestAccess: (...a: unknown[]) => (requestAccess as (...x: unknown[]) => unknown)(...a) }))
vi.mock('../data/sync', async () => {
  class SyncNotAllowedError extends Error {}
  class SyncApprovalError extends SyncNotAllowedError {}
  class SyncAuthError extends Error {}
  return { deriveAccount: async () => ACCOUNT, SyncNotAllowedError, SyncApprovalError, SyncAuthError }
})
vi.mock('./syncRunner', () => ({
  getSyncCode: async () => null,
  setSyncCode: async () => {},
  setAccount: (...a: unknown[]) => (setAccount as (...x: unknown[]) => unknown)(...a),
  runSync: (...a: unknown[]) => (runSync as (...x: unknown[]) => unknown)(...a),
  NEWER_VERSION: 'newer',
  NOT_ALLOWED: 'not allowed',
  PENDING_APPROVAL: 'pending approval',
}))
vi.mock('./toastFeed', () => ({ showToast: (t: string) => toast(t) }))
const { AuthScreen } = await import('./AuthScreen')
const { SyncApprovalError } = await import('../data/sync')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => {
  probe = { status: 'none', exists: false, match: false }
  vi.clearAllMocks()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const type = (el: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
async function mount(mode: 'login' | 'create') {
  const onDone = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<AuthScreen initialMode={mode} onDone={onDone} onBack={() => {}} />))
  return { host, onDone }
}
async function fill(host: HTMLElement, fields: { name?: string; password?: string; repeat?: string; note?: string }) {
  const inputs = [...host.querySelectorAll('input')]
  await act(async () => {
    type(inputs[0], fields.name ?? 'ali')
    type(inputs[1], fields.password ?? 'correct horse')
    if (fields.repeat !== undefined) type(inputs[2], fields.repeat)
    if (fields.note !== undefined) type(inputs[3], fields.note)
  })
  await act(async () => host.querySelector<HTMLButtonElement>('button.auth-submit')!.click())
  await act(async () => void (await new Promise((r) => setTimeout(r, 30))))
}

describe('AuthScreen and the owner\'s approval', () => {
  it('a new account is filed for approval with its username and note, and waits without being treated as an error', async () => {
    runSync.mockRejectedValue(new SyncApprovalError('approval required'))
    const { host, onDone } = await mount('create')
    expect(host.textContent).toContain('onayından geçer')
    await fill(host, { repeat: 'correct horse', note: 'Ali, arkadaşım' })
    expect(requestAccess).toHaveBeenCalledWith(ACCOUNT, 'ali', 'Ali, arkadaşım')
    expect(setAccount).toHaveBeenCalledTimes(1)
    expect(setAccount).toHaveBeenCalledWith(ACCOUNT) // never signed out again
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('onayını bekliyor'))
    expect(onDone).toHaveBeenCalled()
  })

  it('an approved account signs in and syncs as before; no request is filed', async () => {
    probe = { status: 'approved', exists: true, match: true }
    runSync.mockResolvedValue(null)
    const { host, onDone } = await mount('login')
    await fill(host, {})
    expect(requestAccess).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Giriş yapıldı'))
    expect(onDone).toHaveBeenCalled()
  })

  it('says a name is taken, or a password wrong, from the access check alone', async () => {
    probe = { status: 'none', exists: true, match: false }
    const create = await mount('create')
    await fill(create.host, { repeat: 'correct horse' })
    expect(create.host.querySelector('[role=alert]')?.textContent).toContain('alınmış')
    expect(requestAccess).not.toHaveBeenCalled()
    act(() => root?.unmount())
    const login = await mount('login')
    await fill(login.host, {})
    expect(login.host.querySelector('[role=alert]')?.textContent).toContain('Şifre yanlış')
    expect(setAccount).not.toHaveBeenCalled()
  })
})
