import type { Account } from './sync'

/**
 * The person's sync account, kept for them by the server once they sign in with Supabase (see
 * api/_supabase.ts): the same keys sync.ts has always used, so the data, its encryption and the
 * merge do not change. A first sign-in either ties the account this device already uses (or the old
 * username and password) to the person, or starts a new one.
 */
export type VaultReason = 'signed_out' | 'linked' | 'taken' | 'wrong' | 'unavailable'

export class VaultError extends Error {
  readonly reason: VaultReason
  constructor(reason: VaultReason) {
    super(reason)
    this.reason = reason
  }
}
VaultError.prototype.name = 'VaultError'

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)))

/** A new sync account: nothing in it comes from a username or password, all three are random. */
export const freshAccount = (username: string): Account => ({ kind: 'account', username, id: random(), enc: random(), auth: random() })

const bearer = (token: string) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' })

async function failure(res: Response): Promise<VaultError> {
  const { error } = (await res.json().catch(() => ({}))) as { error?: string }
  if (res.status === 401) return new VaultError('signed_out')
  if (error === 'linked' || error === 'taken' || error === 'wrong') return new VaultError(error)
  return new VaultError('unavailable')
}

/** The person's sync account, or null when they have none yet. */
export async function fetchVault(token: string, username: string): Promise<Account | null> {
  const res = await fetch('/api/access?vault=1', { headers: bearer(token) })
  if (!res.ok) throw await failure(res)
  const { account } = (await res.json()) as { account: { id: string; enc: string; auth: string; username: string } | null }
  return account ? { kind: 'account', username: account.username || username, id: account.id, enc: account.enc, auth: account.auth } : null
}

/** Ties the sync account to the person; resolves to the approval status. */
export async function linkVault(token: string, account: Account, note = ''): Promise<string> {
  const res = await fetch('/api/access', { method: 'POST', headers: bearer(token), body: JSON.stringify({ action: 'vault-link', id: account.id, enc: account.enc, auth: account.auth, username: account.username, note }) })
  if (!res.ok) throw await failure(res)
  return ((await res.json()) as { status?: string }).status ?? 'pending'
}

/**
 * Deletes the account on the server: with the Supabase sign-in (the person and their sync account) or,
 * for an account from before, its own token. The device keeps its copy. Resolves to the files removed.
 */
export async function deleteAccount(token: string | null, account: Account | null): Promise<number> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  else if (account) Object.assign(headers, { 'x-sync-id': account.id, 'x-sync-auth': account.auth })
  const res = await fetch('/api/access', { method: 'POST', headers, body: JSON.stringify({ action: 'account-delete' }) })
  if (!res.ok) throw await failure(res)
  return ((await res.json()) as { removed?: number }).removed ?? 0
}
