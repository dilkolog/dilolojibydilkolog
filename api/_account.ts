import { del, get, put } from '@vercel/blob'
import { allowedIds } from './_allow.js'
import { profileStatus } from './_supabase.js'

/**
 * Accounts and their approval. An account is an id (from the username) plus an access token whose
 * hash the first claim keeps (sync/<id>/auth.txt). The site's owner approves each account: only
 * approved accounts may sync, translate, search clips, fetch subtitles and news. Listing a
 * username in SYNC_ALLOWED approves it too (how the owner's own account starts).
 *
 * Requests identify the account with `x-sync-id` and `x-sync-auth`. Approval is a marker blob
 * (access/approved/<id>.json); a request waiting for it is access/requests/<id>.json; a refusal is
 * access/rejected/<id>.json. Answers are remembered a minute to spare the store.
 */
export const ID = /^[0-9a-f]{64}$/
export const TOKEN = /^[0-9a-f]{64}$/

/**
 * The approval is on once the owner has set ADMIN_TOKEN (the way to approve). Until then nothing
 * is withheld, so deploying this changes nothing for anyone before the owner is ready.
 */
export const approvalOn = () => !!process.env.ADMIN_TOKEN?.trim()

export type AccessStatus = 'none' | 'pending' | 'approved' | 'rejected'

export async function sha256(s: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** The storage itself failed (not "nothing there"): a later try may work. */
export class StorageError extends Error {}

/** A blob's text, or null when there is none. A failing store throws StorageError. */
export async function readText(path: string): Promise<string | null> {
  try {
    const blob = await get(path, { access: 'private', useCache: false })
    if (!blob || blob.statusCode !== 200 || !blob.stream) return null
    return await new Response(blob.stream).text()
  } catch {
    throw new StorageError('storage unavailable')
  }
}

export const requestPath = (id: string) => `access/requests/${id}.json`
export const approvedPath = (id: string) => `access/approved/${id}.json`
export const rejectedPath = (id: string) => `access/rejected/${id}.json`

export async function writeJson(path: string, value: unknown) {
  await put(path, JSON.stringify(value), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
}

export async function removeBlob(path: string) {
  await del(path).catch(() => {})
}

const remembered = new Map<string, { value: unknown; until: number }>()
export const clearAccessCache = () => remembered.clear()

async function remember<T>(key: string, ms: number, load: () => Promise<T>): Promise<T> {
  const hit = remembered.get(key)
  if (hit && hit.until > Date.now()) return hit.value as T
  const value = await load()
  remembered.set(key, { value, until: Date.now() + ms })
  return value
}

/** The stored hash of the account's token, or null while nobody has claimed the id. */
export async function storedAuth(id: string): Promise<string | null> {
  const key = `auth:${id}`
  const hit = remembered.get(key)
  if (hit && hit.until > Date.now()) return hit.value as string
  const stored = ((await readText(`sync/${id}/auth.txt`)) ?? '').trim() || null
  // Only a claim is remembered (it never changes); "nobody yet" is asked again, a claim may be minutes old.
  if (stored) remembered.set(key, { value: stored, until: Date.now() + 60_000 })
  return stored
}

/** Whether the token is the account's. A missing claim or a wrong token is false. */
export async function tokenMatches(id: string, token: string): Promise<boolean> {
  const stored = await storedAuth(id)
  return !!stored && (await sha256(token)) === stored
}

/** The account's place in the owner's approval: listed in SYNC_ALLOWED counts as approved. */
export async function accessStatus(id: string): Promise<AccessStatus> {
  if (!approvalOn()) return 'approved'
  const listed = await allowedIds()
  if (listed?.has(id)) return 'approved'
  return remember(`status:${id}`, 30_000, async (): Promise<AccessStatus> => {
    if (await readText(approvedPath(id))) return 'approved'
    // A person signed in with Supabase: the owner may also decide in their profile (Table Editor).
    const profile = await profileStatus(id)
    if (profile === 'approved') return 'approved'
    if (profile === 'rejected' || (await readText(rejectedPath(id)))) return 'rejected'
    if (profile === 'pending' || (await readText(requestPath(id)))) return 'pending'
    return 'none'
  })
}

export const isApproved = async (id: string) => (await accessStatus(id)) === 'approved'

/** The account a request names, with its token checked; null when it names none or the token is wrong. */
export async function accountOf(request: Request): Promise<string | null> {
  const id = request.headers.get('x-sync-id') ?? ''
  const token = request.headers.get('x-sync-auth') ?? ''
  if (!ID.test(id) || !TOKEN.test(token)) return null
  return (await tokenMatches(id, token)) ? id : null
}

const refusal = (error: string, status: AccessStatus) => Response.json({ error, status }, { status: 403, headers: { 'cache-control': 'no-store' } })

/**
 * For the endpoints that use the owner's quotas or bandwidth: null when the request comes from an
 * approved account, otherwise the 403 to send back.
 */
export async function requireApproved(request: Request): Promise<Response | null> {
  // Before the owner sets ADMIN_TOKEN nothing is withheld, anonymous visitors included (the old behavior).
  if (!approvalOn()) return null
  try {
    const id = await accountOf(request)
    if (!id) return refusal('account_required', 'none')
    const status = await accessStatus(id)
    return status === 'approved' ? null : refusal('approval_required', status)
  } catch (e) {
    if (e instanceof StorageError) return Response.json({ error: 'storage unavailable' }, { status: 502 })
    throw e
  }
}

/** Claims the id for the token when nobody has (like the first sync write); true when the account is the token's. */
export async function claimAccount(id: string, token: string): Promise<boolean> {
  if (await storedAuth(id)) return tokenMatches(id, token)
  const hash = await sha256(token)
  await put(`sync/${id}/auth.txt`, hash, { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'text/plain' }).catch(() => {})
  remembered.delete(`auth:${id}`)
  return (await storedAuth(id)) === hash
}
