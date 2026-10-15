// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const session = { access_token: 'tok', user: { email: 'ali@example.com', user_metadata: { full_name: 'Ali Aydın' } } }
const sb = vi.hoisted(() => ({
  signIn: vi.fn(async () => {}),
  signUp: vi.fn(async () => false),
  sendMagicLink: vi.fn(async () => {}),
  currentSession: vi.fn(async (): Promise<unknown> => null),
}))
vi.mock('../data/supabase', () => ({
  supabaseConfigured: () => true,
  supabase: async () => ({}),
  authReturnPending: () => false,
  isRecoveryReturn: () => false,
  returnError: () => null,
  clearReturn: () => {},
  authErrorText: (m: string) => m,
  sendPasswordReset: async () => {},
  setNewPassword: async () => {},
  signInWithGoogle: async () => {},
  signOutSupabase: async () => {},
  ...sb,
}))
const runner = vi.hoisted(() => ({ account: null as unknown, runSync: vi.fn(async () => null) }))
vi.mock('./syncRunner', () => ({
  getAccount: async () => runner.account,
  setAccount: async (a: unknown) => void (runner.account = a),
  getSyncCode: async () => null,
  setSyncCode: async () => {},
  runSync: runner.runSync,
}))

const { SupabaseAuth } = await import('./SupabaseAuth')

let root: ReturnType<typeof createRoot> | undefined
let posts: Record<string, unknown>[] = []
let stored: unknown = null

beforeEach(() => {
  posts = []
  stored = null
  runner.account = null
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>
      posts.push(body)
      stored = { id: body.id, enc: body.enc, auth: body.auth, username: body.username }
      return Response.json({ status: 'pending' })
    }
    return Response.json({ account: url.includes('vault') ? stored : null })
  })
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

async function mount() {
  const onDone = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<SupabaseAuth onDone={onDone} onBack={() => {}} />))
  return { host, onDone }
}

const type = async (input: HTMLInputElement, value: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!
const settle = () => act(() => new Promise((r) => setTimeout(r, 20)))

describe('SupabaseAuth', () => {
  it('a first sign-in with nothing to bring along starts a new account, tied to the person', async () => {
    sb.currentSession.mockResolvedValue(session)
    const { host, onDone } = await mount()
    await type(host.querySelector<HTMLInputElement>('input[type=email]')!, 'ali@example.com')
    await type(host.querySelector<HTMLInputElement>('input[type=password]')!, 'gizli-sifre-1')
    await act(async () => host.querySelector('form')!.requestSubmit())
    await settle()
    expect(sb.signIn).toHaveBeenCalledWith('ali@example.com', 'gizli-sifre-1')
    expect(host.querySelector('h1')?.textContent).toBe('Neredeyse bitti')
    await act(async () => button(host, 'Eski hesabım yok, yeni başla').click())
    await settle()
    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({ action: 'vault-link', username: 'Ali Aydın' })
    expect(posts[0]!.id).toMatch(/^[0-9a-f]{64}$/)
    expect(runner.account).toMatchObject({ kind: 'account', id: posts[0]!.id })
    expect(runner.runSync).toHaveBeenCalled()
    expect(onDone).toHaveBeenCalled()
  })

  it('a device already signed in with the old way ties that account without asking', async () => {
    sb.currentSession.mockResolvedValue(session)
    runner.account = { kind: 'account', username: 'ali', id: 'a'.repeat(64), enc: 'c'.repeat(64), auth: '1'.repeat(64) }
    const { host, onDone } = await mount()
    await type(host.querySelector<HTMLInputElement>('input[type=email]')!, 'ali@example.com')
    await type(host.querySelector<HTMLInputElement>('input[type=password]')!, 'gizli-sifre-1')
    await act(async () => host.querySelector('form')!.requestSubmit())
    await settle()
    expect(posts[0]).toMatchObject({ action: 'vault-link', id: 'a'.repeat(64), auth: '1'.repeat(64) })
    expect(onDone).toHaveBeenCalled()
  })

  it('the passwordless way sends a link and says so', async () => {
    const { host } = await mount()
    await act(async () => button(host, 'Şifresiz giriş: bağlantı gönder').click())
    await type(host.querySelector<HTMLInputElement>('input[type=email]')!, 'ali@example.com')
    await act(async () => host.querySelector('form')!.requestSubmit())
    await settle()
    expect(sb.sendMagicLink).toHaveBeenCalledWith('ali@example.com')
    expect(host.textContent).toContain('Giriş bağlantısını gönderdik')
  })

  it('a sign-up waiting for its email confirmation says to check the inbox', async () => {
    const { host } = await mount()
    await act(async () => button(host, 'Hesap oluştur').click())
    const [pw, again] = host.querySelectorAll<HTMLInputElement>('input[type=password]')
    await type(host.querySelector<HTMLInputElement>('input[type=email]')!, 'veli@example.com')
    await type(pw!, 'gizli-sifre-2')
    await type(again!, 'gizli-sifre-2')
    await act(async () => host.querySelector('form')!.requestSubmit())
    await settle()
    expect(sb.signUp).toHaveBeenCalledWith('veli@example.com', 'gizli-sifre-2', { username: undefined, note: undefined })
    expect(host.textContent).toContain('onay bağlantısına dokun')
  })
})
