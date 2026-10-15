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

/** fetch, with the signed-in account's identity: for the endpoints that need an approved account. */
export async function accessFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  for (const [k, v] of Object.entries(accessHeaders(await getStoredAccount().catch(() => null)))) headers.set(k, v)
  return fetch(input, { ...init, headers })
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

export interface AdminEntry {
  id: string
  username: string
  note?: string
  at: string
}
export interface AdminLists {
  pending: AdminEntry[]
  approved: AdminEntry[]
  rejected: AdminEntry[]
  /** Friends, shares and reminders: Supabase not set up, 0003 not run, ready to move, or moved. Missing on an older server. */
  tables?: 'off' | 'missing' | 'ready' | 'on'
}

export interface MoveCounts {
  cards: number
  follows: number
  shares: number
  reminders: number
}

const adminHeaders = (token: string) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' })

/** The owner's view: who waits, who is approved, who was turned down. Throws on a wrong token. */
export async function adminLists(token: string): Promise<AdminLists> {
  const res = await fetch('/api/admin', { headers: adminHeaders(token) })
  if (res.status === 503) throw new Error('not configured')
  if (!res.ok) throw new Error(res.status === 403 ? 'forbidden' : `admin ${res.status}`)
  return (await res.json()) as AdminLists
}

export async function adminAct(token: string, action: 'approve' | 'reject' | 'revoke', id: string): Promise<void> {
  const res = await fetch('/api/admin', { method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ action, id }) })
  if (!res.ok) throw new Error(`admin ${res.status}`)
}

/** Frees a username's sync account (the server deletes its claim and data); resolves to the number of files removed. */
export async function adminRelease(token: string, username: string): Promise<number> {
  const res = await fetch('/api/admin', { method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ action: 'release', username }) })
  if (!res.ok) throw new Error(`admin ${res.status}`)
  return ((await res.json()) as { removed?: number }).removed ?? 0
}

/** Moves friends, shared lists and reminders from Blob to the Supabase tables; resolves to what was copied. */
export async function adminMoveTables(token: string): Promise<MoveCounts> {
  const res = await fetch('/api/admin', { method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ action: 'move-tables' }) })
  if (res.status === 409) throw new Error('missing')
  if (!res.ok) throw new Error(`admin ${res.status}`)
  return (await res.json()) as MoveCounts
}
