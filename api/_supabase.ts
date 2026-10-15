/**
 * Supabase as the accounts' front door: people sign in there (email and password, a magic link,
 * Google), and Supabase keeps, for each of them, the sync account the app has always used (the
 * id, encryption key and access token of sync.ts). The data itself stays where it was; Supabase
 * only answers "who is this" and "which sync account is theirs".
 *
 * Tables (supabase/migrations/0001_accounts.sql):
 *   profiles(user_id, username, note, approved, rejected)  one per person, made by a trigger on sign-up;
 *     `approved` is the owner's switch (Table Editor), like the Yönetici card's approval.
 *   sync_keys(user_id, sync_id, enc, auth, username)  the person's sync account. Only this server
 *     (the service role) reads or writes it: a row is written after the access token is checked
 *     against the sync store's claim, so nobody can tie another person's account to themselves.
 *
 * Environment: SUPABASE_URL (or the app's VITE_SUPABASE_URL) and SUPABASE_SECRET_KEY (or the legacy
 * SUPABASE_SERVICE_ROLE_KEY). Without
 * them everything here is off and the old username/password sign-in is the only one.
 */

const base = () => (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
/** The new secret key (sb_secret_…) or the legacy service_role key; both only on the server. */
const serviceKey = () => (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
/** A legacy key is a JWT and goes as the bearer too; a new sb_ key goes only as `apikey` (the gateway turns it into one). */
const keyHeaders = (): Record<string, string> => (serviceKey().startsWith('sb_') ? { apikey: serviceKey() } : { apikey: serviceKey(), authorization: `Bearer ${serviceKey()}` })

export const supabaseOn = () => /^https:\/\//.test(base()) && !!serviceKey()

export interface SupabaseUser {
  id: string
  email: string
  /** A name to show the owner: the one chosen at sign-up, Google's, or the email's first part. */
  name: string
}

export interface Vault {
  id: string
  enc: string
  auth: string
  username: string
}

const HEX64 = /^[0-9a-f]{64}$/
const UUID = /^[0-9a-f-]{36}$/

/** The person a request's `Authorization: Bearer <access token>` belongs to; null when none or expired. */
export async function supabaseUser(request: Request): Promise<SupabaseUser | null> {
  if (!supabaseOn()) return null
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token || token.length > 4096) return null
  try {
    const res = await fetch(`${base()}/auth/v1/user`, { headers: { apikey: serviceKey(), authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const u = (await res.json()) as { id?: unknown; email?: unknown; user_metadata?: Record<string, unknown> }
    if (typeof u.id !== 'string' || !UUID.test(u.id)) return null
    const email = typeof u.email === 'string' ? u.email : ''
    const meta = u.user_metadata ?? {}
    const named = [meta.username, meta.full_name, meta.name].find((v): v is string => typeof v === 'string' && !!v.trim())
    return { id: u.id, email, name: (named ?? email.split('@')[0] ?? '').trim().slice(0, 40) || 'kullanıcı' }
  } catch {
    return null
  }
}

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${base()}/rest/v1/${path}`, {
    ...init,
    headers: { ...keyHeaders(), 'content-type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
  })
}

/** The person's sync account, or null when they have none yet. Throws when Supabase cannot be read. */
export async function vaultOf(userId: string): Promise<Vault | null> {
  const res = await rest(`sync_keys?user_id=eq.${encodeURIComponent(userId)}&select=sync_id,enc,auth,username`)
  if (!res.ok) throw new Error(`supabase ${res.status}`)
  const rows = (await res.json()) as { sync_id: string; enc: string; auth: string; username: string | null }[]
  const row = rows[0]
  if (!row || !HEX64.test(row.sync_id) || !HEX64.test(row.enc) || !HEX64.test(row.auth)) return null
  return { id: row.sync_id, enc: row.enc, auth: row.auth, username: row.username ?? '' }
}

/** The person's profile, made when the sign-up trigger did not (it was added later, or failed). */
export async function ensureProfile(user: SupabaseUser): Promise<void> {
  const res = await rest('profiles?on_conflict=user_id', {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: user.id, username: user.name, email: user.email || null }),
  })
  if (!res.ok) throw new Error(`supabase ${res.status}`)
}

/** Writes the person's sync account. 'taken': another person already has this sync account. */
export async function saveVault(userId: string, vault: Vault): Promise<'ok' | 'taken'> {
  const res = await rest('sync_keys?on_conflict=user_id', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: userId, sync_id: vault.id, enc: vault.enc, auth: vault.auth, username: vault.username || null }),
  })
  if (res.status === 409) return 'taken'
  if (!res.ok) throw new Error(`supabase ${res.status}`)
  return 'ok'
}

/**
 * The owner's word on a sync account through its person's profile: 'approved', 'rejected', 'pending'
 * (tied to a person the owner has not decided on), or null when no person has it (or Supabase is off
 * or cannot be read: the sync store's own markers decide then).
 */
export async function profileStatus(syncId: string): Promise<'approved' | 'rejected' | 'pending' | null> {
  if (!supabaseOn() || !HEX64.test(syncId)) return null
  try {
    const res = await rest(`sync_keys?sync_id=eq.${syncId}&select=profiles(approved,rejected)`)
    if (!res.ok) return null
    const rows = (await res.json()) as { profiles: { approved?: boolean; rejected?: boolean } | null }[]
    const p = rows[0]?.profiles
    if (!rows[0]) return null
    return p?.approved ? 'approved' : p?.rejected ? 'rejected' : 'pending'
  } catch {
    return null
  }
}
