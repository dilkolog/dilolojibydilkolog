import { del, get, list, put } from '@vercel/blob'
import { isAllowed } from './_allow.js'
import { approvalOn, isApproved, TOKEN as ACCOUNT_TOKEN } from './_account.js'

/**
 * Encrypted sync storage. The app sends opaque, client-encrypted bytes under an id derived from
 * the learner's sync code; this function only stores and returns them (private Blob store).
 *
 * GET  /api/sync?id=<64 hex>&part=<core | m-<40 hex> | ev-YYYY-MM | tx-<40 hex>>  → the bytes, or 404
 * PUT  same query, body = bytes                         → stored (with `If-Match: <etag of the GET>`: 412 if the file changed since;
 *                                                          with `If-None-Match: *`: only if nothing is there yet, else 412)
 *
 * Parts: "core" (everything small, plus the list of the others), "m-…" (a picture or recording), "ev-YYYY-MM"
 * (the answers of one month) and "tx-…" (one reading text). Splitting keeps every file far below the request limit
 * and lets a sync send only what changed.
 *
 * Accounts (username + password) send an access token in `x-sync-auth` and need the owner's
 * approval first once ADMIN_TOKEN is set (_account.ts); a refusal for want of it is 403 "approval required". The first write keeps
 * its hash; from then on reads and writes without the matching token get 403, so a guessable
 * username can't be read or overwritten by others. Sync codes (random ids) send no token.
 * When SYNC_ALLOWED is set (see _allow.ts), ids not on it get 403 "not allowed".
 *
 * Restore points: before the day's first new core replaces the old one, the old one is kept as
 * that day's point (part "h-YYYY-MM-DD", read-only, the same access check); a week of them is kept.
 * GET ?id=…&history=1 lists the days.
 */
const ID = /^[0-9a-f]{64}$/
const PART = /^(core|m-[0-9a-f]{40}|tx-[0-9a-f]{40}|ev-\d{4}-\d{2}|h-\d{4}-\d{2}-\d{2})$/
const POINTS_KEPT = 7
/** Vercel's request body limit is 4.5 MB; stay under it. */
const MAX_BYTES = 4_400_000

const TOKEN = /^[0-9a-f]{64}$/

async function sha256(s: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** The storage itself failed (not "nothing there"): a later try may work, and nothing may be decided from it. */
class StorageError extends Error {}

/** A blob, or null when it does not exist. A failing store throws StorageError, never reads as "missing". */
async function read(path: string) {
  try {
    return await get(path, { access: 'private', useCache: false })
  } catch {
    throw new StorageError('storage unavailable')
  }
}

async function storedAuth(id: string): Promise<string | null> {
  const blob = await read(`sync/${id}/auth.txt`)
  if (!blob || blob.statusCode !== 200 || !blob.stream) return null
  return (await new Response(blob.stream).text()).trim()
}

/** null = allowed; otherwise the refusal. Claims the id on an account's first write. */
async function checkAuth(request: Request, write: boolean): Promise<Response | null> {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  const token = request.headers.get('x-sync-auth')
  if (token !== null && !TOKEN.test(token)) return new Response('bad token', { status: 400 })
  const stored = await storedAuth(id)
  if (stored) return token && (await sha256(token)) === stored ? null : new Response('forbidden', { status: 403 })
  if (token && write) {
    const hash = await sha256(token)
    // Two first writes at once: only one claim sticks; the other must match it.
    await put(`sync/${id}/auth.txt`, hash, { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'text/plain' }).catch(() => {})
    if ((await storedAuth(id)) !== hash) return new Response('forbidden', { status: 403 })
  }
  return null
}

/**
 * Who may use the store: an account (it sends a token) once the owner has approved it; a sync code
 * (random id, no token) as before, by the SYNC_ALLOWED list when there is one. null = allowed.
 */
async function permitted(request: Request, id: string): Promise<Response | null> {
  const token = request.headers.get('x-sync-auth')
  if (token !== null && !ACCOUNT_TOKEN.test(token)) return new Response('bad token', { status: 400 })
  if (token !== null && approvalOn()) return (await isApproved(id)) ? null : new Response('approval required', { status: 403 })
  return (await isAllowed(id)) ? null : new Response('not allowed', { status: 403 })
}

function target(request: Request): string | null {
  const q = new URL(request.url).searchParams
  const id = q.get('id') ?? ''
  const part = q.get('part') ?? ''
  return ID.test(id) && PART.test(part) ? `sync/${id}/${part}.bin` : null
}

/** The restore points of an id, newest first (days, YYYY-MM-DD). */
async function points(id: string): Promise<{ day: string; pathname: string }[]> {
  const { blobs } = await list({ prefix: `sync/${id}/h-` })
  return blobs
    .map((b) => ({ day: b.pathname.match(/h-(\d{4}-\d{2}-\d{2})\.bin$/)?.[1] ?? '', pathname: b.pathname }))
    .filter((p) => p.day)
    .sort((a, b) => b.day.localeCompare(a.day))
}

/** Keeps the core about to be replaced as today's point (once a day) and drops the oldest beyond a week. */
async function keepPoint(id: string, today: string) {
  // Most syncs of a day find today's point made: nothing to read then.
  if ((await list({ prefix: `sync/${id}/h-${today}` })).blobs.length) return
  const old = await get(`sync/${id}/core.bin`, { access: 'private', useCache: false }).catch(() => null)
  if (!old || old.statusCode !== 200 || !old.stream) return
  const bytes = await new Response(old.stream).arrayBuffer()
  await put(`sync/${id}/h-${today}.bin`, bytes, { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/octet-stream' }).catch(() => {})
  const all = await points(id)
  for (const p of all.slice(POINTS_KEPT)) await del(p.pathname).catch(() => {})
}

export async function GET(request: Request): Promise<Response> {
  try {
    return await handleGet(request)
  } catch (e) {
    // A failing store is "try later" (502), never "no data": the device would take empty for the truth and write it over the real thing.
    if (e instanceof StorageError) return new Response('storage unavailable', { status: 502 })
    throw e
  }
}

async function handleGet(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams
  if (q.get('history') === '1') {
    const id = q.get('id') ?? ''
    if (!ID.test(id)) return new Response('bad request', { status: 400 })
    const notPermitted = await permitted(request, id)
    if (notPermitted) return notPermitted
    const refused = await checkAuth(request, false)
    if (refused) return refused
    return Response.json({ days: (await points(id)).map((p) => p.day) }, { headers: { 'cache-control': 'no-store' } })
  }
  const path = target(request)
  if (!path) return new Response('bad request', { status: 400 })
  const notPermitted = await permitted(request, new URL(request.url).searchParams.get('id') ?? '')
  if (notPermitted) return notPermitted
  const refused = await checkAuth(request, false)
  if (refused) return refused
  const blob = await read(path)
  if (!blob || blob.statusCode !== 200 || !blob.stream) return new Response('not found', { status: 404 })
  const etag = blob.blob?.etag
  return new Response(blob.stream, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', ...(etag ? { etag } : {}) } })
}

export async function PUT(request: Request): Promise<Response> {
  try {
    return await handlePut(request)
  } catch (e) {
    if (e instanceof StorageError) return new Response('storage unavailable', { status: 502 })
    throw e
  }
}

async function handlePut(request: Request): Promise<Response> {
  const path = target(request)
  if (!path) return new Response('bad request', { status: 400 })
  // Restore points are made here, never sent.
  if (new URL(request.url).searchParams.get('part')?.startsWith('h-')) return new Response('read only', { status: 405 })
  const notPermitted = await permitted(request, new URL(request.url).searchParams.get('id') ?? '')
  if (notPermitted) return notPermitted
  const body = await request.arrayBuffer()
  if (!body.byteLength || body.byteLength > MAX_BYTES) return new Response('too large', { status: 413 })
  const refused = await checkAuth(request, true)
  if (refused) return refused
  const q = new URL(request.url).searchParams
  if (q.get('part') === 'core') await keepPoint(q.get('id')!, new Date().toISOString().slice(0, 10))
  // The core carries the ETag it was read with: if another device wrote it since, nothing is overwritten (412)
  // and the device merges again with what is there now.
  const ifMatch = request.headers.get('if-match') ?? undefined
  // A part that is new: created only if nobody else made it in the meantime.
  const createOnly = request.headers.get('if-none-match') === '*'
  try {
    await put(path, body, { access: 'private', addRandomSuffix: false, allowOverwrite: !createOnly, contentType: 'application/octet-stream', ...(ifMatch ? { ifMatch } : {}) })
  } catch (e) {
    // The SDK reports both a stale ETag and an already existing file as a failed precondition.
    if ((ifMatch || createOnly) && (e as { name?: string })?.name === 'BlobPreconditionFailedError') return new Response('changed', { status: 412 })
    if (createOnly && /exist/i.test((e as Error)?.message ?? '')) return new Response('changed', { status: 412 })
    throw e
  }
  return new Response(null, { status: 204 })
}
