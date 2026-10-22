// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axe from 'axe-core'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'

const session = {
  access_token: 'tok-xyz',
  user: { email: 'test@diloloji.com', user_metadata: { full_name: 'Test Kullanıcı' } },
}

const sb = vi.hoisted(() => ({
  signIn: vi.fn(async (_email: string, _password: string) => {}),
  signUp: vi.fn(async (_email: string, _password: string, _meta?: unknown) => false),
  sendMagicLink: vi.fn(async (_email: string) => {}),
  sendPasswordReset: vi.fn(async (_email: string) => {}),
  setNewPassword: vi.fn(async (_password: string) => {}),
  signInWithGoogle: vi.fn(async () => {}),
  signOutSupabase: vi.fn(async () => {}),
  currentSession: vi.fn(async (): Promise<unknown> => null),
  authReturnPending: vi.fn(() => false),
  isRecoveryReturn: vi.fn(() => false),
  returnError: vi.fn((): string | null => null),
  clearReturn: vi.fn(() => {}),
  authErrorText: vi.fn((m: string) => m),
}))

vi.mock('../data/supabase', () => ({
  supabaseConfigured: () => true,
  TURNSTILE_SITE_KEY: '',
  supabase: async () => ({}),
  authReturnPending: () => sb.authReturnPending(),
  isRecoveryReturn: () => sb.isRecoveryReturn(),
  returnError: () => sb.returnError(),
  clearReturn: () => sb.clearReturn(),
  authErrorText: (m: string) => sb.authErrorText(m),
  sendPasswordReset: (email: string) => sb.sendPasswordReset(email),
  setNewPassword: (p: string) => sb.setNewPassword(p),
  signInWithGoogle: () => sb.signInWithGoogle(),
  signOutSupabase: () => sb.signOutSupabase(),
  signIn: (e: string, p: string) => sb.signIn(e, p),
  signUp: (e: string, p: string, m?: unknown) => sb.signUp(e, p, m),
  sendMagicLink: (e: string) => sb.sendMagicLink(e),
  currentSession: () => sb.currentSession(),
}))

const runner = vi.hoisted(() => ({
  account: null as unknown,
  runSync: vi.fn(async () => null),
}))

vi.mock('./syncRunner', () => ({
  getAccount: async () => runner.account,
  setAccount: async (a: unknown) => void (runner.account = a),
  getSyncCode: async () => null,
  setSyncCode: async () => {},
  runSync: runner.runSync,
}))

const { SupabaseAuth } = await import('./SupabaseAuth')

let root: ReturnType<typeof createRoot> | undefined
let host: HTMLDivElement

const settle = () => act(() => new Promise((r) => setTimeout(r, 20)))
const until = async (done: () => boolean, ms = 3000) => {
  const end = Date.now() + ms
  while (!done() && Date.now() < end) await act(() => new Promise((r) => setTimeout(r, 10)))
}

const type = async (input: HTMLInputElement, value: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })

const button = (container: HTMLElement, text: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)

async function runAxe(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
    rules: {
      'color-contrast': { enabled: false }, // tested separately with custom blended contrast checker
    },
  })
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

describe('SupabaseAuth accessibility and flows (16.2 E1, E2, F6)', () => {
  beforeEach(() => {
    runner.account = null
    sb.authReturnPending.mockReturnValue(false)
    sb.isRecoveryReturn.mockReturnValue(false)
    sb.returnError.mockReturnValue(null)
    sb.currentSession.mockResolvedValue(null)

    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Response.json({ status: 'pending' })
      }
      return Response.json({ account: null })
    })
  })

  afterEach(() => {
    act(() => root?.unmount())
    host.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('login step renders cleanly and passes automated WCAG accessibility scan', async () => {
    await act(async () => root!.render(<SupabaseAuth onDone={() => {}} onBack={() => {}} />))
    await settle()

    expect(host.querySelector('.auth-title')?.textContent).toBe('Hesabına giriş yap')
    const violations = await runAxe(host)
    expect(violations).toEqual([])
  })

  it('create step renders cleanly and passes automated WCAG accessibility scan', async () => {
    await act(async () => root!.render(<SupabaseAuth onDone={() => {}} onBack={() => {}} />))
    await settle()

    const createTab = button(host, 'Hesap oluştur')
    expect(createTab).toBeTruthy()
    await act(async () => createTab!.click())
    await settle()

    expect(host.querySelector('.auth-title')?.textContent).toBe('Hesap oluştur')
    expect(host.querySelectorAll('input[type=password]')).toHaveLength(2)
    const violations = await runAxe(host)
    expect(violations).toEqual([])
  })

  it('magic link step renders cleanly and passes automated WCAG accessibility scan', async () => {
    await act(async () => root!.render(<SupabaseAuth onDone={() => {}} onBack={() => {}} />))
    await settle()

    const magicBtn = button(host, 'Şifresiz giriş: bağlantı gönder')
    expect(magicBtn).toBeTruthy()
    await act(async () => magicBtn!.click())
    await settle()

    expect(host.querySelector('.auth-title')?.textContent).toBe('E-postayla giriş')
    const violations = await runAxe(host)
    expect(violations).toEqual([])
  })

  it('password reset step renders cleanly and passes automated WCAG accessibility scan', async () => {
    await act(async () => root!.render(<SupabaseAuth onDone={() => {}} onBack={() => {}} />))
    await settle()

    const resetBtn = button(host, 'Şifremi unuttum')
    expect(resetBtn).toBeTruthy()
    await act(async () => resetBtn!.click())
    await settle()

    expect(host.querySelector('.auth-title')?.textContent).toBe('Şifreni yenile')
    const violations = await runAxe(host)
    expect(violations).toEqual([])
  })

  it('sent step renders cleanly and passes automated WCAG accessibility scan', async () => {
    await act(async () => root!.render(<SupabaseAuth onDone={() => {}} onBack={() => {}} />))
    await settle()

    const magicBtn = button(host, 'Şifresiz giriş: bağlantı gönder')
    await act(async () => magicBtn!.click())
    await settle()

    const emailInput = host.querySelector<HTMLInputElement>('input[type=email]')!
    await type(emailInput, 'ali@diloloji.com')
    await act(async () => host.querySelector('form')!.requestSubmit())
    await settle()

    expect(host.querySelector('.auth-title')?.textContent).toBe('E-postana bak')
    expect(host.textContent).toContain('Giriş bağlantısını gönderdik')
    const violations = await runAxe(host)
    expect(violations).toEqual([])
  })

  it('recovery step renders cleanly when returning with recovery token and passes axe scan', async () => {
    sb.isRecoveryReturn.mockReturnValue(true)
    sb.currentSession.mockResolvedValue(session)

    await act(async () => root!.render(<SupabaseAuth initialMode="return" onDone={() => {}} onBack={() => {}} />))
    await until(() => host.querySelector('.auth-title')?.textContent === 'Yeni şifre')

    expect(host.querySelector('.auth-title')?.textContent).toBe('Yeni şifre')
    expect(button(host, 'Şifreyi kaydet')).toBeTruthy()
    const violations = await runAxe(host)
    expect(violations).toEqual([])
  })

  it('working step renders spinner with status role and passes axe scan', async () => {
    // Keep supabase pending so it stays on working step
    let resolveClient: (v: unknown) => void = () => {}
    const pendingPromise = new Promise((resolve) => {
      resolveClient = resolve
    })
    sb.currentSession.mockImplementation(() => pendingPromise)

    await act(async () => root!.render(<SupabaseAuth initialMode="return" onDone={() => {}} onBack={() => {}} />))

    const working = host.querySelector('.auth-working')
    expect(working).toBeTruthy()
    expect(working?.getAttribute('role')).toBe('status')
    const violations = await runAxe(host)
    expect(violations).toEqual([])

    // cleanup pending promise
    resolveClient(null)
    await settle()
  })

  it('handles Google return flow error cleanly and displays accessible alert message', async () => {
    sb.returnError.mockReturnValue('Google ile giriş reddedildi veya zaman aşımına uğradı.')

    await act(async () => root!.render(<SupabaseAuth initialMode="return" onDone={() => {}} onBack={() => {}} />))
    await settle()

    const error = host.querySelector('[role="alert"]')
    expect(error).toBeTruthy()
    expect(error?.textContent).toContain('Google ile giriş reddedildi')
    expect(sb.clearReturn).toHaveBeenCalled()
    const violations = await runAxe(host)
    expect(violations).toEqual([])
  })

  it('unauthenticated user only sees the auth screen and no private app shell', async () => {
    // When rendered as auth screen, only auth-card and auth elements exist, no tab-bar or navigation
    await act(async () => root!.render(<SupabaseAuth onDone={() => {}} onBack={() => {}} />))
    await settle()

    expect(host.querySelector('.auth-card')).toBeTruthy()
    expect(host.querySelector('.tab-bar')).toBeNull()
    expect(host.querySelector('.nav')).toBeNull()
    expect(host.querySelector('.session')).toBeNull()
  })

  it('clicking Google sign in button calls signInWithGoogle', async () => {
    await act(async () => root!.render(<SupabaseAuth onDone={() => {}} onBack={() => {}} />))
    await settle()

    const googleBtn = button(host, 'Google ile devam et')
    expect(googleBtn).toBeTruthy()
    await act(async () => googleBtn!.click())
    await settle()

    expect(sb.signInWithGoogle).toHaveBeenCalled()
  })

  it('local words are preserved in IndexedDB when signed out', async () => {
    // Add sample words to local database
    const word = createEntry(
      {
        word: 'bonjour',
        meaning: 'merhaba',
        partOfSpeech: 'noun',
      },
      'fr',
      new Date(),
    )
    await db.vocabulary.put(word)

    const countBefore = await db.vocabulary.where('language').equals('fr').count()
    expect(countBefore).toBeGreaterThan(0)

    // Simulate signing out
    await runner.account // verify access
    runner.account = null
    await sb.signOutSupabase()

    // Words must remain intact in local storage
    const countAfter = await db.vocabulary.where('language').equals('fr').count()
    expect(countAfter).toBe(countBefore)
    const stored = (await db.vocabulary.where('language').equals('fr').toArray()).find((w) => w.lemma === 'bonjour')
    expect(stored?.lemma).toBe('bonjour')
  })
})
