import { list } from '@vercel/blob'
import { approvedPath, clearAccessCache, ID, readText, rejectedPath, removeBlob, requestPath, sha256, StorageError, writeJson } from './_account.js'

/**
 * The owner's side of the approval (ADMIN_TOKEN, a Vercel environment variable, as a bearer token).
 *
 * GET  /api/admin → { pending, approved, rejected }: each { id, username, note?, at }
 * POST /api/admin { action: 'approve' | 'reject' | 'revoke', id }
 *   approve: the account may use the quota features; reject: it may not (and stops showing as
 *   waiting); revoke: takes an approval back (it counts as turned down).
 *
 * With no ADMIN_TOKEN set the endpoint is off (503). A change takes up to a minute on other
 * server instances (answers are remembered that long).
 */
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

async function authorised(request: Request): Promise<Response | null> {
  const secret = process.env.ADMIN_TOKEN?.trim()
  if (!secret) return json({ error: 'not configured' }, 503)
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  // Hashes are compared, so the comparison does not leak how much of the token matched.
  return given && (await sha256(given)) === (await sha256(secret)) ? null : json({ error: 'forbidden' }, 403)
}

type Entry = { id: string; username: string; note?: string; at: string }

async function entries(prefix: string): Promise<Entry[]> {
  const { blobs } = await list({ prefix })
  const out = await Promise.all(
    blobs.slice(0, 200).map(async (b) => {
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
  const body = (await request.json().catch(() => null)) as { action?: string; id?: string } | null
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
    return json({ ok: true })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}
