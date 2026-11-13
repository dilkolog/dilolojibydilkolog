import { supabase } from './supabase'

/**
 * The owner's second factor: a TOTP code from an authenticator app (Google Authenticator, 1Password, Apple Passwords…),
 * through Supabase Auth's own MFA. Once one is verified, the admin endpoint wants a session that gave the code (aal2;
 * api/_owner.ts), so a taken-over mailbox or Google account no longer opens it. Setting up a second app is the way back
 * when a phone is lost; the last resort is Supabase → Authentication → Users → the owner → delete the factor.
 */

export interface Factor {
  id: string
  name: string
  createdAt: string
}

export class MfaError extends Error {}

const text = (message: string) => {
  const m = message.toLowerCase()
  if (m.includes('invalid') || m.includes('expired') || m.includes('code')) return 'Kod yanlış ya da süresi geçti; uygulamadaki yeni kodu yaz.'
  if (m.includes('aal2')) return 'Bunun için önce doğrulama kodunu gir.'
  if (m.includes('too many') || m.includes('rate')) return 'Çok fazla deneme; biraz bekleyip yeniden dene.'
  return 'Olmadı; birazdan yeniden dene.'
}

async function run<T>(call: Promise<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await call
  if (error || data === null) throw new MfaError(text(error?.message ?? ''))
  return data
}

/** The verified authenticator apps. */
export async function factors(): Promise<Factor[]> {
  const data = await run((await supabase()).auth.mfa.listFactors())
  return data.totp.filter((f) => f.status === 'verified').map((f) => ({ id: f.id, name: f.friendly_name ?? '', createdAt: f.created_at }))
}

/** Whether this session has given its code (aal2), and whether one is asked for. */
export async function level(): Promise<{ proven: boolean; needed: boolean }> {
  const data = await run((await supabase()).auth.mfa.getAuthenticatorAssuranceLevel())
  return { proven: data.currentLevel === 'aal2', needed: data.nextLevel === 'aal2' }
}

/** Starts adding an app: the QR code to scan (an SVG data URL) and the secret to type in instead. */
export async function startEnroll(name: string): Promise<{ id: string; qr: string; secret: string }> {
  const client = await supabase()
  // An earlier try left half-done (never verified) is cleared first: Supabase refuses a second factor of the same name.
  const all = await run(client.auth.mfa.listFactors())
  for (const f of all.all.filter((x) => x.status !== 'verified')) await client.auth.mfa.unenroll({ factorId: f.id })
  const data = await run(client.auth.mfa.enroll({ factorType: 'totp', friendlyName: name }))
  return { id: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
}

/** Checks a code against an app: finishes adding it, or proves this session (it becomes aal2). */
export async function confirm(factorId: string, code: string): Promise<void> {
  await run((await supabase()).auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') }))
}

/** Proves this session with a code from any of the owner's apps. */
export async function prove(code: string): Promise<void> {
  const list = await factors()
  if (!list.length) throw new MfaError('Kayıtlı doğrulama uygulaması yok.')
  let last: unknown = null
  for (const f of list) {
    try {
      return await confirm(f.id, code)
    } catch (e) {
      last = e
    }
  }
  throw last
}

/** Stops a half-done adding (the QR code was not confirmed). */
export async function cancelEnroll(factorId: string): Promise<void> {
  await (await supabase()).auth.mfa.unenroll({ factorId }).catch(() => undefined)
}

/** Removes an app (Supabase asks for a session that gave its code). */
export async function remove(factorId: string): Promise<void> {
  await run((await supabase()).auth.mfa.unenroll({ factorId }))
  // The session's level follows the factors: read it again so the admin endpoint sees the change.
  await (await supabase()).auth.refreshSession().catch(() => undefined)
}
