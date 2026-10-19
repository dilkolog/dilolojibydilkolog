// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACCOUNT_EVENT } from '../data/access'
import { whileSigningIn } from './signInGate'

const state = { configured: true, session: true, account: null as unknown }

vi.mock('../data/supabase', () => ({ supabaseConfigured: () => state.configured, hasStoredSession: () => state.session }))
vi.mock('./syncRunner', () => ({ getAccount: async () => state.account }))

const { useSignedIn } = await import('./useSignedIn')

let root: ReturnType<typeof createRoot> | undefined
let seen: boolean | undefined

function Probe() {
  const signedIn = useSignedIn()
  useEffect(() => {
    seen = signedIn
  })
  return null
}
const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 20))))
const mount = async () => {
  root = createRoot(document.body.appendChild(document.createElement('div')))
  await act(async () => root!.render(<Probe />))
  await wait()
}

beforeEach(() => {
  state.configured = true
  state.session = true
  state.account = null
  seen = undefined
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

describe('useSignedIn', () => {
  it('asks for an account when none is stored', async () => {
    await mount()
    expect(seen).toBe(false)
  })

  it('is signed in with an account and a Supabase session', async () => {
    state.account = { id: 'a' }
    await mount()
    expect(seen).toBe(true)
  })

  it('treats the old username account (no Supabase session) as signed out', async () => {
    state.account = { id: 'a' }
    state.session = false
    await mount()
    expect(seen).toBe(false)
  })

  it('follows the account being set and cleared', async () => {
    await mount()
    expect(seen).toBe(false)
    state.account = { id: 'a' }
    act(() => void window.dispatchEvent(new Event(ACCOUNT_EVENT)))
    await wait()
    expect(seen).toBe(true)
    state.account = null
    act(() => void window.dispatchEvent(new Event(ACCOUNT_EVENT)))
    await wait()
    expect(seen).toBe(false)
  })

  it('stays closed while a sign-in completes (account set, first sync running), then opens', async () => {
    await mount()
    expect(seen).toBe(false)
    let finish!: () => void
    const running = whileSigningIn(() => new Promise<void>((r) => (finish = r)))
    // The account is set on this device before the sync is done: the gate must not open on that.
    state.account = { id: 'a' }
    act(() => void window.dispatchEvent(new Event(ACCOUNT_EVENT)))
    await wait()
    expect(seen).toBe(false)
    finish()
    await act(async () => void (await running))
    await wait()
    expect(seen).toBe(true)
  })

  it('a device already in the app is not sent back to sign-in by a sign-in completing', async () => {
    state.account = { id: 'a' }
    await mount()
    expect(seen).toBe(true)
    let finish!: () => void
    const running = whileSigningIn(() => new Promise<void>((r) => (finish = r)))
    act(() => void window.dispatchEvent(new Event(ACCOUNT_EVENT)))
    await wait()
    expect(seen).toBe(true)
    finish()
    await act(async () => void (await running))
  })

  it('asks for nothing without Supabase (development, tests)', async () => {
    state.configured = false
    await mount()
    expect(seen).toBe(true)
  })
})
