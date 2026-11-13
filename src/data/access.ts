import { db } from './instance'
import type { Account } from './sync'

/**
 * The site owner's approval of accounts. Only approved accounts sync, translate, search clips,
 * fetch subtitles and news, or use the AI screens; everyone may add words and study them. The
 * server decides (api/_account.ts); this is the device's side: who it is, what the server said.
 */
export type AccessStatus = 'none' | 'pending' | 'approved' | 'rejected'

/** Shown where a feature waits for approval. */
export const APPROVAL_MESSAGE = 'Bu özellik, site sahibinin onayladığı hesaplara açık. Ayarlar → Hesap bölümünde hesabının durumunu görebilirsin.'

/** The server's refusal for want of an account or its approval. */
export const isApprovalRefusal = (error: unknown) => error === 'account_required' || error === 'approval_required'

/** Sent when the device's account changes (signing in or out): the approval status is read again. */
export const ACCOUNT_EVENT = 'diloloji:account'

const META = 'accessStatus'

export async function getStoredAccount(): Promise<Account | null> {
  return ((await db.meta.get('syncAccount'))?.value as Account | undefined) ?? null
}

/** The headers that tell the server which account a request comes from. */
export const accessHeaders = (account: Account | null): Record<string, string> => (account ? { 'x-sync-id': account.id, 'x-sync-auth': account.auth } : {})

const send = (input: string, init: RequestInit, account: Account | null) => {
  const headers = new Headers(init.headers)
  for (const [k, v] of Object.entries(accessHeaders(account))) headers.set(k, v)
  return fetch(input, { ...init, headers })
}

/**
 * fetch, with the signed-in account's identity: for the endpoints that need an approved account. A key the server no
 * longer takes (renewed on another device: renewSyncKey) is fetched again with the Supabase sign-in, and the request
 * sent once more.
 */
export async function accessFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const account = await getStoredAccount().catch(() => null)
  const res = await send(input, init, account)
  if (res.status !== 403 || !account || init.body instanceof ReadableStream) return res
  const { error } = (await res.clone().json().catch(() => ({}))) as { error?: unknown }
  if (error !== 'account_required') return res
  const fresh = await refreshedAccount(account)
  return fresh ? send(input, init, fresh) : res
}

let refreshing: Promise<Account | null> | null = null

/** The account with the token the server holds now, saved on the device; null when it is the same (or cannot be read). */
function refreshedAccount(stale: Account): Promise<Account | null> {
  refreshing ??= (async () => {
    try {
      const { currentSession, hasStoredSession } = await import('./supabase')
      if (!hasStoredSession()) return null
      const session = await currentSession()
      if (!session) return null
      const { fetchVault } = await import('./vault')
      const fresh = await fetchVault(session.access_token, stale.username)
      if (!fresh || fresh.id !== stale.id || fresh.auth === stale.auth) return null
      const now = await getStoredAccount()
      if (now?.id !== stale.id) return null
      const account = { ...now, auth: fresh.auth }
      await db.meta.put({ key: 'syncAccount', value: account })
      return account
    } catch {
      return null
    }
  })().finally(() => (refreshing = null))
  return refreshing
}

/**
 * Gives the person's sync account a new token (after a password change): a copied old key stops working. This device
 * keeps working with the new one; the others fetch it with their sign-in on their next request. False when it could not
 * be done (signed out, offline).
 */
export async function renewSyncKey(): Promise<boolean> {
  try {
    const { currentSession } = await import('./supabase')
    const session = await currentSession()
    if (!session) return false
    const { rotateVault } = await import('./vault')
    const fresh = await rotateVault(session.access_token)
    if (!fresh) return false
    const now = await getStoredAccount()
    if (now?.id === fresh.id) await db.meta.put({ key: 'syncAccount', value: { ...now, auth: fresh.auth } })
    return true
  } catch {
    return false
  }
}

/** What the device last heard (kept so the app doesn't wait for the network to know). */
export async function cachedAccess(): Promise<AccessStatus | null> {
  const v = (await db.meta.get(META))?.value as { status?: AccessStatus } | undefined
  return v?.status ?? null
}

export const saveAccess = (status: AccessStatus) => db.meta.put({ key: META, value: { status, at: new Date().toISOString() } })
export const forgetAccess = () => db.meta.delete(META)

/** Whether the server asks for approval at all (the owner has set it up); null when it cannot be told. */
export async function approvalEnabled(): Promise<boolean | null> {
  try {
    const res = await fetch('/api/access')
    if (!res.ok) return null
    const { enabled } = (await res.json()) as { enabled?: unknown }
    return typeof enabled === 'boolean' ? enabled : null
  } catch {
    return null
  }
}

/** Whether the id is claimed, whether this account's token is its, and the approval status. */
export async function probeAccount(account: Account): Promise<{ status: AccessStatus; exists: boolean; match: boolean }> {
  const res = await fetch('/api/access', { headers: accessHeaders(account) })
  if (!res.ok) throw new Error(`access ${res.status}`)
  return (await res.json()) as { status: AccessStatus; exists: boolean; match: boolean }
}

/** Files the account for the owner's approval with its username and a note (the server shows both to the owner). */
export async function requestAccess(account: Account, username: string, note = ''): Promise<AccessStatus> {
  const res = await fetch('/api/access', { method: 'POST', headers: { 'content-type': 'application/json', ...accessHeaders(account) }, body: JSON.stringify({ username, note }) })
  if (!res.ok) throw new Error(`access ${res.status}`)
  const { status } = (await res.json()) as { status: AccessStatus }
  await saveAccess(status)
  return status
}
