import { del, list } from '@vercel/blob'
import { docsMoved, docsReady, listDocPaths, moveDocs, MOVE_BATCH } from './_docs.js'
import { isOwnerSession, listReports, unpublishList } from './_owner.js'
import { deletePerson, listPeople, pendingCount, updatePerson, type PeopleFilter } from './_adminPeople.js'
import { checkHealth, problems } from './_health.js'
import { idOfUsername } from './_allow.js'
import { mirrorApproval } from './_supabase.js'
import { moveToTables } from './_moveTables.js'
import { tablesState } from './_tables.js'
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
 * POST /api/admin { action: 'move-docs', from? }
 *   one step of copying the small R2 documents into Supabase (_docs.ts, after 0010); answers { copied, next, at }:
 *   the caller repeats with `from: next` until `next` is null.
 * The owner signed in (a Supabase session whose confirmed email is OWNER_EMAIL) needs no token.
 *
 * POST /api/admin { action: 'move-tables' }
 *   moves friends, shared lists and reminders from Blob to the Supabase tables (see _moveTables.ts);
 *   GET's `tables` says whether that is possible ('ready'), done ('on'), waits for 0003 ('missing') or
 *   Supabase is not set up ('off').
 *
 * ADMIN_TOKEN may hold several keys (separated by spaces or commas): during a rotation the old and
 * the new one both work until the old one is taken out.
 * With no ADMIN_TOKEN set the endpoint is off (503). A change takes up to a minute on other
 * server instances (answers are remembered that long).
 */
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

async function authorised(request: Request): Promise<Response | null> {
  // The owner signed in (OWNER_EMAIL, confirmed) needs no token.
  if (await isOwnerSession(request)) return null
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
  // Read from the documents (Supabase once 0010 has run, with the old files until the move finished); a flooded
  // queue is capped so the page stays readable, the newest shown first.
  const paths = (await listDocPaths(prefix)).slice(0, LIST_CAP)
  const out = await Promise.all(
    paths.map(async (path) => {
      const id = path.match(/([0-9a-f]{64})\.json$/)?.[1]
      const raw = id ? await readText(path) : null
      if (!id || !raw) return null
      try {
        return { id, ...(JSON.parse(raw) as Omit<Entry, 'id'>) }
      } catch {
        return null
      }
    }),
  )
  return out
    .filter((e): e is Entry => !!e)
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
    .slice(0, SHOWN)
}

export async function GET(request: Request): Promise<Response> {
  const refused = await authorised(request)
  if (refused) return refused
  const q = new URL(request.url).searchParams
  const view = q.get('view')
  if (view) return ownerView(view, q)
  try {
    const [pending, approved, rejected, tables, moved] = await Promise.all([entries('access/requests/'), entries('access/approved/'), entries('access/rejected/'), tablesState().catch(() => 'off' as const), docsMoved().catch(() => false)])
    return json({ pending, approved, rejected, tables, docs: moved ? 'on' : docsReady() ? 'ready' : 'off' })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

export async function POST(request: Request): Promise<Response> {
  const refused = await authorised(request)
  if (refused) return refused
  const body = (await request.json().catch(() => null)) as { action?: string; id?: string; username?: string; from?: unknown; user?: unknown; change?: unknown; level?: unknown } | null
  if (body?.action === 'release') return release(body.username)
  if (body?.action === 'move-tables') return moveTables()
  if (body?.action === 'move-docs') return moveDocsStep(body.from)
  if (body?.action === 'person') return person(body)
  if (body?.action === 'person-delete') return personDelete(body)
  if (body?.action === 'unpublish') return json({ ok: await unpublishList(String(body.id ?? '')).catch(() => false) })
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

/** The one-time move to the Supabase tables (see the header). */
async function moveTables(): Promise<Response> {
  try {
    const state = await tablesState()
    if (state === 'off') return json({ error: 'supabase not configured' }, 503)
    if (state === 'missing') return json({ error: 'run 0003_server_tables.sql first' }, 409)
    return json({ ok: true, ...(await moveToTables()) })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

/** One step of the move of the small documents (names, requests, blocks, reports…) to Supabase (_docs.ts); the screen repeats it with `next`. */
async function moveDocsStep(from: unknown): Promise<Response> {
  const f = from && typeof from === 'object' ? (from as { prefix?: unknown; cursor?: unknown }) : {}
  const prefix = Number.isInteger(f.prefix) && (f.prefix as number) >= 0 ? (f.prefix as number) : 0
  const cursor = typeof f.cursor === 'string' && f.cursor.length < 2000 ? f.cursor : undefined
  try {
    return json({ ...(await moveDocs({ prefix, cursor })), batch: MOVE_BATCH })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'move failed' }, 502)
  }
}

// --- The owner's admin screen (GET ?view=…, POST person / unpublish) ------------------------------------------------

const FILTERS: PeopleFilter[] = ['pending', 'approved', 'rejected', 'all']

/**
 * GET /api/admin?view=me      → { owner: true } (the screen's way to know it may show itself)
 * GET /api/admin?view=people&filter=pending|approved|rejected|all&q=… → { people, levels, pending }
 * GET /api/admin?view=reports&days=1..30 → { reports }
 * GET /api/admin?view=system  → { health, problems, docs, tables }
 */
async function ownerView(view: string, q: URLSearchParams): Promise<Response> {
  try {
    if (view === 'me') return json({ owner: true })
    if (view === 'people') {
      const filter = FILTERS.find((f) => f === q.get('filter')) ?? 'pending'
      const [list, pending] = await Promise.all([listPeople(filter, q.get('q')), pendingCount()])
      return json({ ...list, pending })
    }
    if (view === 'reports') {
      const days = Math.min(30, Math.max(1, Number(q.get('days')) || 7))
      return json({ reports: await listReports(days) })
    }
    if (view === 'system') {
      const health = await checkHealth()
      const [found, moved, tables] = await Promise.all([problems(health), docsMoved().catch(() => false), tablesState().catch(() => 'off' as const)])
      return json({ health, problems: found, docs: moved ? 'on' : docsReady() ? 'ready' : 'off', tables })
    }
    return json({ error: 'unknown view' }, 400)
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

/** POST { action: 'person-delete', user, confirm: <the person's e-mail> } */
async function personDelete(body: { user?: unknown; confirm?: unknown }): Promise<Response> {
  try {
    const result = await deletePerson(body.user, body.confirm)
    if (result === 'ok') return json({ ok: true })
    if (result === 'missing') return json({ error: 'no such person' }, 404)
    if (result === 'owner') return json({ error: 'an owner account is not deleted here' }, 403)
    if (result === 'confirm') return json({ error: 'confirm with the e-mail' }, 400)
    return json({ error: 'bad request' }, 400)
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    return json({ error: 'delete failed' }, 502)
  }
}

/** POST { action: 'person', user, change?: 'approve'|'reject'|'wait', level?: 'kapali'|'kelime'|'calisma'|'tam'|null } */
async function person(body: { user?: unknown; change?: unknown; level?: unknown }): Promise<Response> {
  try {
    const result = await updatePerson(body.user, body.change, body.level)
    if (result === 'ok') return json({ ok: true })
    if (result === 'missing') return json({ error: 'ai_level column missing: run migration 0007' }, 409)
    return json({ error: 'bad request' }, 400)
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}
