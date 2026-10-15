import { del, list } from '@vercel/blob'
import { idOfUsername } from './_allow.js'
import { mirrorApproval } from './_supabase.js'
import { approvedPath, clearAccessCache, ID, readText, rejectedPath, removeBlob, requestPath, sha256, StorageError, writeJson } from './_account.js'

/**
 * The owner's side of the approval (ADMIN_TOKEN, a Vercel environment variable, as a bearer token).
 *
 * GET  /api/admin → { pending, approved, rejected }: each { id, username, note?, at }
 * POST /api/admin { action: 'approve' | 'reject' | 'revoke', id }
 *   approve: the account may use the quota features; reject: it may not (and stops showing as
 *   waiting); revoke: takes an approval back (it counts as turned down).
 * POST /api/admin { action: 'release', username }
 *   frees a username's sync account: its claim and everything stored under it are deleted, so the
 *   name can be claimed again. For the case where someone else claimed a name the owner listed in
 *   SYNC_ALLOWED before the owner did (the first claim wins). It also deletes that account's data.
 *
 * ADMIN_TOKEN may hold several keys (separated by spaces or commas): during a rotation the old and
 * the new one both work until the old one is taken out.
 * With no ADMIN_TOKEN set the endpoint is off (503). A change takes up to a minute on other
 * server instances (answers are remembered that long).
 */
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

async function authorised(request: Request): Promise<Response | null> {
  const secrets = (process.env.ADMIN_TOKEN ?? '').split(/[\s,]+/).filter(Boolean)
  if (!secrets.length) return json({ error: 'not configured' }, 503)
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!given) return json({ error: 'forbidden' }, 403)
  // Hashes are compared, so the comparison does not leak how much of the token matched.
  const hash = await sha256(given)
  const hashes = await Promise.all(secrets.map(sha256))
  return hashes.includes(hash) ? null : json({ error: 'forbidden' }, 403)
}

type Entry = { id: string; username: string; note?: string; at: string }

/** How many of the newest entries of one kind are shown (the rest of a long queue waits behind them). */
const SHOWN = 200
/** Listing stops here: a flooded queue must not make the page unreadable. */
const LIST_CAP = 5000

async function entries(prefix: string): Promise<Entry[]> {
  // The whole list is paged through and the newest taken: the first page is in no useful order, so a flood of
  // requests could otherwise hide a real applicant.
  const all: { pathname: string; uploadedAt?: Date | string }[] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix, cursor })
    all.push(...page.blobs)
    cursor = page.hasMore && all.length < LIST_CAP ? page.cursor : undefined
  } while (cursor)
  const newest = all.sort((a, b) => new Date(b.uploadedAt ?? 0).getTime() - new Date(a.uploadedAt ?? 0).getTime()).slice(0, SHOWN)
  const out = await Promise.all(
    newest.map(async (b) => {
      const id = b.pathname.match(/([0-9a-f]{64})\.json$/)?.[1]
      const raw = id ? await readText(b.pathname) : null
      if (!id || !raw) return null
      try {
        return { id, ...(JSON.parse(raw) as Omit<Entry, 'id'>) }
      } catch {
        return null
      }
    }),
  )
  return out.filter((e): e is Entry => !!e).sort((a, b) => b.at.localeCompare(a.at))
}

export async function GET(request: Request): Promise<Response> {
  const refused = await authorised(request)
  if (refused) return refused
  try {
    const [pending, approved, rejected] = await Promise.all([entries('access/requests/'), entries('access/approved/'), entries('access/rejected/')])
    return json({ pending, approved, rejected })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

export async function POST(request: Request): Promise<Response> {
  const refused = await authorised(request)
  if (refused) return refused
  const body = (await request.json().catch(() => null)) as { action?: string; id?: string; username?: string } | null
  if (body?.action === 'release') return release(body.username)
  const id = body?.id ?? ''
  if (!ID.test(id) || !['approve', 'reject', 'revoke'].includes(body?.action ?? '')) return json({ error: 'bad request' }, 400)
  try {
    const was = JSON.parse((await readText(requestPath(id))) ?? (await readText(approvedPath(id))) ?? (await readText(rejectedPath(id))) ?? '{}') as Partial<Entry>
    const record = { username: was.username ?? '', note: was.note ?? '', at: new Date().toISOString() }
    if (body!.action === 'approve') {
      await writeJson(approvedPath(id), record)
      await removeBlob(rejectedPath(id))
    } else {
      await writeJson(rejectedPath(id), record)
      await removeBlob(approvedPath(id))
    }
    await removeBlob(requestPath(id))
    clearAccessCache()
    // A person signed in with Supabase: their profile follows, so the database lets them write (or not).
    await mirrorApproval(id, body!.action === 'approve' ? 'approved' : 'rejected')
    return json({ ok: true })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

/** Deletes a username's sync claim and every file under it (see the header). */
async function release(username: unknown): Promise<Response> {
  if (typeof username !== 'string' || !/^[\p{L}\p{N}._-]{3,32}$/u.test(username.trim())) return json({ error: 'bad username' }, 400)
  const id = await idOfUsername(username)
  try {
    let removed = 0
    let cursor: string | undefined
    do {
      const page = await list({ prefix: `sync/${id}/`, cursor })
      if (page.blobs.length) await del(page.blobs.map((b) => b.pathname))
      removed += page.blobs.length
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
    clearAccessCache()
    return json({ ok: true, removed })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}
