import { del, get, put } from './_blob'
import { createDoc, DocsError, isDocPath, readDoc, removeDoc, writeDoc } from './_docs.js'
import { profileStatus, supabaseOn } from './_supabase.js'

/**
 * Accounts and their approval. An account is an id (from the username) plus an access token whose
 * hash the first claim keeps (sync/<id>/auth.txt). The site's owner approves each account: only
 * approved accounts may sync, translate, search clips, fetch subtitles and news.
 *
 * Requests identify the account with `x-sync-id` and `x-sync-auth`. Approval is a marker blob
 * (access/approved/<id>.json); a request waiting for it is access/requests/<id>.json; a refusal is
 * access/rejected/<id>.json. Answers are remembered a minute to spare the store.
 */
export const ID = /^[0-9a-f]{64}$/
export const TOKEN = /^[0-9a-f]{64}$/

/**
 * The approval is on when the owner decides who comes in: with Supabase sign-in the owner approves people (the admin
 * screen, profiles.approved), so it is on by itself (APPROVAL=off switches it off); without Supabase (local development,
 * tests) only with APPROVAL=on. Otherwise nothing is withheld.
 */
export const approvalOn = () => {
  const set = process.env.APPROVAL?.trim().toLowerCase()
  return set === 'on' || (supabaseOn() && set !== 'off')
}

export type AccessStatus = 'none' | 'pending' | 'approved' | 'rejected'

export async function sha256(s: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** The storage itself failed (not "nothing there"): a later try may work. */
export class StorageError extends Error {}

/**
 * A blob's text, or null when there is none. A failing store throws StorageError. The server's small documents (names,
 * requests, blocks, reports, approval marks, account keys) are in Supabase when it is set up (_docs.ts).
 */
export async function readText(path: string): Promise<string | null> {
  if (isDocPath(path)) {
    const doc = await readDoc(path).catch(storageFailure)
    if (doc !== undefined) return doc
  }
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

export const writeJson = (path: string, value: unknown) => writeText(path, JSON.stringify(value))

/** Writes the text over whatever was there (the table for a document path, else the file). */
export async function writeText(path: string, text: string, contentType = 'application/json') {
  if (isDocPath(path) && (await writeDoc(path, text).catch(storageFailure))) return
  await put(path, text, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType })
}

/** Writes the text only if there is none yet; false when there was. */
export async function createText(path: string, text: string, contentType = 'application/json'): Promise<boolean> {
  if (isDocPath(path)) {
    const made = await createDoc(path, text).catch(storageFailure)
    if (made !== undefined) return made
  }
  try {
    await put(path, text, { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType })
    return true
  } catch (e) {
    if ((await readText(path)) !== null) return false
    throw e
  }
}

export async function removeBlob(path: string, strict = false) {
  if (isDocPath(path)) {
    await removeDoc(path).catch((error: unknown) => { if (strict) throw error })
    return
  }
  await del(path).catch((error: unknown) => { if (strict) throw error })
}

/** A Supabase failure on a document is a storage failure (the endpoints answer 502 and the app tries again). */
function storageFailure(e: unknown): never {
  if (e instanceof DocsError) throw new StorageError('storage unavailable')
  throw e
}

const remembered = new Map<string, { value: unknown; until: number }>()
/** How long an instance trusts an approval it read (see accessStatus). */
export const APPROVAL_CACHE_MS = 2 * 60_000
export const clearAccessCache = () => remembered.clear()

/** The stored hash of the account's token, or null while nobody has claimed the id. */
export async function storedAuth(id: string): Promise<string | null> {
  const key = `auth:${id}`
  const hit = remembered.get(key)
  if (hit && hit.until > Date.now()) return hit.value as string
  const stored = ((await readText(`sync/${id}/auth.txt`)) ?? '').trim() || null
  // Only a claim is remembered; "nobody yet" is asked again, a claim may be minutes old. Kept as short as an approval:
  // a key the person renewed (replaceAuth) stops working on the other instances once this runs out.
  if (stored) remembered.set(key, { value: stored, until: Date.now() + APPROVAL_CACHE_MS })
  return stored
}

/** Whether the token is the account's. A missing claim or a wrong token is false. */
export async function tokenMatches(id: string, token: string): Promise<boolean> {
  const stored = await storedAuth(id)
  return !!stored && (await sha256(token)) === stored
}

/** The account's place in the owner's approval. */
export async function accessStatus(id: string): Promise<AccessStatus> {
  if (!approvalOn()) return 'approved'
  // An approval is remembered for a couple of minutes (every check is several billed reads), any other answer for a short
  // while so a decision shows soon. clearAccessCache only reaches this instance: a rejected or deleted account keeps what
  // it had on the others until its approval here runs out, so this stays short (APPROVAL_CACHE_MS).
  const hit = remembered.get(`status:${id}`)
  if (hit && hit.until > Date.now()) return hit.value as AccessStatus
  const status = await (async (): Promise<AccessStatus> => {
    if (await readText(approvedPath(id))) return 'approved'
    // A person signed in with Supabase: the owner may also decide in their profile (Table Editor).
    const profile = await profileStatus(id)
    if (profile === 'approved') return 'approved'
    if (profile === 'rejected' || (await readText(rejectedPath(id)))) return 'rejected'
    if (profile === 'pending' || (await readText(requestPath(id)))) return 'pending'
    return 'none'
  })()
  remembered.set(`status:${id}`, { value: status, until: Date.now() + (status === 'approved' ? APPROVAL_CACHE_MS : 30_000) })
  return status
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
  if (!approvalOn()) {
    // No approval list: every account counts as approved. With Supabase sign-in the site is for people with an
    // account though, so the quota-using endpoints still want one (a sync account claimed through its sign-in:
    // sync.ts never creates one by a first write). Without Supabase (local development) nothing is withheld.
    if (!supabaseOn()) return null
    try {
      return (await accountOf(request)) ? null : refusal('account_required', 'none')
    } catch (e) {
      if (e instanceof StorageError) return Response.json({ error: 'storage unavailable' }, { status: 502 })
      throw e
    }
  }
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

/**
 * Gives a claimed account a new token (the person renewed their sync key): the old one stops working at once on this
 * instance and within APPROVAL_CACHE_MS on the others. Throws when the store fails.
 */
export async function replaceAuth(id: string, token: string): Promise<void> {
  await writeText(`sync/${id}/auth.txt`, await sha256(token), 'text/plain')
  remembered.delete(`auth:${id}`)
}

/** Claims the id for the token when nobody has (like the first sync write); true when the account is the token's. */
export async function claimAccount(id: string, token: string): Promise<boolean> {
  if (await storedAuth(id)) return tokenMatches(id, token)
  const hash = await sha256(token)
  await createText(`sync/${id}/auth.txt`, hash, 'text/plain').catch(() => false)
  remembered.delete(`auth:${id}`)
  return (await storedAuth(id)) === hash
}
