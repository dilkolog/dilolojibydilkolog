import type { Session, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase sign-in: email and password, a magic link by email, or Google. On only when the build
 * has VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (both public by design: what a person may do is
 * decided by Supabase's row security and by this app's server). The library is loaded only when a
 * sign-in is under way, not with the first screen.
 *
 * Supabase answers "who is this"; the person's sync account (the keys sync.ts has always used) is
 * kept for them by the server (vault.ts), so a new device needs only the sign-in.
 */
const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
/** The publishable key (sb_publishable_…) or the legacy anon key. */
const KEY = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined)?.trim() ?? ''

export const supabaseConfigured = () => /^https:\/\//.test(URL_) && !!KEY

/**
 * Cloudflare Turnstile's site key (public), when the build has VITE_TURNSTILE_SITE_KEY: the sign-in forms then show
 * the check and send its token with every email sign-in, sign-up, link and reset (Supabase verifies it once the owner
 * turns on CAPTCHA protection with Turnstile's secret). Without it nothing is shown or sent. Google needs no token.
 */
export const TURNSTILE_SITE_KEY = ((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '').trim()

let client: Promise<SupabaseClient> | null = null

export function supabase(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_, KEY, { auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'diloloji-auth' } }),
  )
  return client
}

/** Where a link from an email or Google brings the person back: the app itself. */
const back = () => `${location.origin}/`

/** The page was opened by a sign-in link (email confirmation, magic link, Google, password reset). */
export function authReturnPending(): boolean {
  if (!supabaseConfigured() || typeof location === 'undefined') return false
  return /[?&]code=|[#&]access_token=|[?&#]error_description=/.test(location.search + location.hash)
}

/** The return was a password-reset link: the person sets a new password next. */
export const isRecoveryReturn = () => typeof location !== 'undefined' && /type=recovery/.test(location.search + location.hash)

/** The error a returning link carried (an expired one, a refused Google sign-in), in its own words. */
export function returnError(): string | null {
  if (typeof location === 'undefined') return null
  const params = new URLSearchParams(location.hash.slice(1) || location.search.slice(1))
  return params.get('error_description')
}

/** Takes the sign-in leftovers out of the address bar. */
export function clearReturn() {
  if (typeof history !== 'undefined') history.replaceState(null, '', location.pathname)
}

export async function currentSession(): Promise<Session | null> {
  if (!supabaseConfigured()) return null
  const { data } = await (await supabase()).auth.getSession()
  return data.session
}

/** Supabase's English error messages, in Turkish for the ones a person meets. */
export function authErrorText(message: string, unknownAsGeneric = false): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-posta ya da şifre yanlış.'
  if (m.includes('disposable_email')) return 'Tek kullanımlık (geçici) e-posta adresleriyle hesap açılamıyor; kalıcı bir adres kullan ya da Google ile devam et.'
  if (m.includes('captcha')) return 'Robot kontrolü tamamlanamadı; kutucuğun yenilenmesini bekleyip tekrar dene.'
  if (m.includes('email not confirmed')) return 'E-postanı henüz onaylamadın: gelen kutundaki bağlantıya dokun.'
  if (m.includes('user already registered')) return 'Bu e-postayla zaten bir hesap var. "Giriş yap"a geç.'
  if (m.includes('password should be') || m.includes('weak password')) return 'Şifre çok zayıf: en az 8 karakter, harf ve rakam karışık olsun.'
  if (m.includes('for security purposes') || m.includes('only request this after')) return 'Bunu kısa sürede ikinci kez istedin; bir dakika bekleyip tekrar dene.'
  if (m.includes('unable to validate email') || m.includes('invalid format') || m.includes('invalid email')) return 'E-posta adresi geçersiz görünüyor; kontrol edip tekrar yaz.'
  if (m.includes('sending') && m.includes('email')) return 'Mail şu an gönderilemedi; biraz sonra tekrar dene ya da Google ile giriş yap.'
  if (m.includes('not authorized') || m.includes('email address') && m.includes('authorized')) return 'Bu adrese şu an mail gönderilemiyor; başka bir adres dene ya da Google ile giriş yap.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Kısa sürede çok deneme oldu; birkaç dakika bekleyip tekrar dene.'
  if (m.includes('expired') || (m.includes('invalid') && m.includes('link'))) return 'Bağlantının süresi dolmuş; yenisini iste.'
  if (m.includes('provider is not enabled')) return 'Bu giriş yolu henüz açılmadı (site sahibi Supabase\'te açmalı).'
  // Chrome says "Failed to fetch", Safari "Load failed", Firefox "NetworkError when attempting to fetch".
  if (m.includes('fetch') || m.includes('load failed') || m.includes('network')) return 'Sunucuya bağlanılamadı; internet bağlantını kontrol et.'
  // A message the library sends that nothing above knows is English and technical: say it plainly instead.
  return unknownAsGeneric ? 'Bir sorun oldu; biraz sonra tekrar dene. Sürerse destek@diloloji.com adresine yaz.' : message
}

/** A sign-in call that failed in a way the person cannot fix: it is reported (/api/log) so the cause can be read there. */
export class SupabaseAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupabaseAuthError'
  }
}

/** Errors a person caused or can fix themselves (a wrong password, a weak one): not worth a report. */
const EXPECTED = /invalid login credentials|disposable_email|captcha|email not confirmed|already registered|password should be|weak password|for security purposes|only request this after|rate limit|too many|invalid (format|email)|unable to validate email|expired|signups? not allowed|not authorized/i

async function run<T extends { error: { message: string; status?: number; code?: string; name?: string } | null }>(p: Promise<T>): Promise<T> {
  const r = await p
  if (r.error) {
    const { message, status, code, name } = r.error
    const text = authErrorText(message, true)
    if (EXPECTED.test(message)) throw new Error(text)
    // What the server or the library said, plainly, so a "something went wrong" can be told apart (this is no secret: no address, no password).
    const detail = [name, status, code, message].filter(Boolean).join(' · ').slice(0, 120)
    throw new SupabaseAuthError(`${text} (${detail})`)
  }
  return r
}

/** A new account. Returns whether it is ready (false: the email must be confirmed first). */
export async function signUp(email: string, password: string, meta: { username?: string; note?: string }, captchaToken?: string): Promise<boolean> {
  const { data } = await run((await supabase()).auth.signUp({ email, password, options: { data: meta, emailRedirectTo: back(), captchaToken } }))
  return !!data.session
}

export async function signIn(email: string, password: string, captchaToken?: string): Promise<void> {
  await run((await supabase()).auth.signInWithPassword({ email, password, options: { captchaToken } }))
}

/** Sends a link that signs in (and makes the account the first time). */
export async function sendMagicLink(email: string, captchaToken?: string): Promise<void> {
  await run((await supabase()).auth.signInWithOtp({ email, options: { emailRedirectTo: back(), shouldCreateUser: true, captchaToken } }))
}

/** Sends the account's confirmation mail again (the first link was used, expired or lost). */
export async function resendConfirmation(email: string, captchaToken?: string): Promise<void> {
  await run((await supabase()).auth.resend({ type: 'signup', email, options: { emailRedirectTo: back(), captchaToken } }))
}

/** Leaves for Google; the person comes back to the app signed in. */
export async function signInWithGoogle(): Promise<void> {
  await run((await supabase()).auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back() } }))
}

export async function sendPasswordReset(email: string, captchaToken?: string): Promise<void> {
  await run((await supabase()).auth.resetPasswordForEmail(email, { redirectTo: back(), captchaToken }))
}

export async function setNewPassword(password: string): Promise<void> {
  await run((await supabase()).auth.updateUser({ password }))
}

export async function signOutSupabase(): Promise<void> {
  if (!supabaseConfigured()) return
  try {
    if (!client && !localStorage.getItem('diloloji-auth')) return
  } catch {
    // Storage unreadable: sign out anyway.
  }
  // 'local': only this device signs out (the screens say so); the default would end every device's session.
  await (await supabase()).auth.signOut({ scope: 'local' }).catch(() => undefined)
}

/** Whether this device keeps a Supabase sign-in (without loading the library). */
export function hasStoredSession(): boolean {
  if (!supabaseConfigured()) return false
  try {
    return !!localStorage.getItem('diloloji-auth')
  } catch {
    return false
  }
}

export interface Identity {
  email: string
  /** The name the person goes by (chosen at sign-up, or Google's); '' when none. */
  name: string
  /** Google's profile picture, when signed in with Google. */
  avatar: string
  /** How the person signs in: 'email', 'google'… */
  providers: string[]
}

/** The signed-in person, or null when this device keeps no Supabase sign-in. */
export async function currentIdentity(): Promise<Identity | null> {
  if (!hasStoredSession()) return null
  const s = await currentSession().catch(() => null)
  if (!s) return null
  const meta = (s.user.app_metadata ?? {}) as { provider?: unknown; providers?: unknown }
  const providers = Array.isArray(meta.providers) ? meta.providers.filter((p): p is string => typeof p === 'string') : typeof meta.provider === 'string' ? [meta.provider] : []
  const user = (s.user.user_metadata ?? {}) as Record<string, unknown>
  const text = (...keys: string[]) => keys.map((k) => user[k]).find((v): v is string => typeof v === 'string' && !!v.trim())?.trim() ?? ''
  const avatar = text('avatar_url', 'picture')
  return { email: s.user.email ?? '', providers, name: text('full_name', 'name', 'username'), avatar: /^https:\/\//.test(avatar) ? avatar : '' }
}

const PROVIDER_NAME: Record<string, string> = { email: 'E-posta ve şifre', google: 'Google' }

/** How the person signs in, in words: "Google", "E-posta ve şifre · Google". */
export const providersText = (providers: string[]) => providers.map((p) => PROVIDER_NAME[p] ?? p).join(' · ') || 'E-posta'
