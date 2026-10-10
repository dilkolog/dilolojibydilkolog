import { accessStatus, approvalOn, claimAccount, clearAccessCache, ID, requestPath, StorageError, storedAuth, tokenMatches, TOKEN, writeJson, type AccessStatus } from './_account.js'
import { fromApp } from './_origin.js'

/**
 * An account's way to the owner's approval.
 *
 * GET  /api/access  (x-sync-id, x-sync-auth)
 *   → { status: 'none' | 'pending' | 'approved' | 'rejected', exists: boolean, match: boolean }
 *   Without the headers: { enabled } says whether approval is asked for (ADMIN_TOKEN is set).
 *   `exists`: someone has claimed this id; `match`: the token is theirs (sign-in checks both).
 * POST /api/access  { username, note? }  (same headers)
 *   claims the id when unclaimed and files a request the owner sees with the username and note.
 *
 * The server otherwise never sees usernames; this request is the one place it does, so the owner
 * knows whom they approve. Passwords and data stay out of it.
 */
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const id = request.headers.get('x-sync-id') ?? ''
  const token = request.headers.get('x-sync-auth') ?? ''
  // No account named: whether approval is asked for at all (a visitor's screens depend on it).
  if (!id && !token) return json({ enabled: approvalOn(), status: 'none', exists: false, match: false })
  if (!ID.test(id) || !TOKEN.test(token)) return json({ error: 'bad request' }, 400)
  try {
    const exists = !!(await storedAuth(id))
    const match = exists && (await tokenMatches(id, token))
    const status: AccessStatus = match ? await accessStatus(id) : 'none'
    return json({ status, exists, match })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const id = request.headers.get('x-sync-id') ?? ''
  const token = request.headers.get('x-sync-auth') ?? ''
  if (!ID.test(id) || !TOKEN.test(token)) return json({ error: 'bad request' }, 400)
  const body = (await request.json().catch(() => null)) as { username?: unknown; note?: unknown } | null
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 200) : ''
  if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(username)) return json({ error: 'bad username' }, 400)
  try {
    if (!(await claimAccount(id, token))) return json({ error: 'forbidden' }, 403)
    // No approval to ask for until the owner has set ADMIN_TOKEN.
    if (!approvalOn()) return json({ status: 'approved' })
    const status = await accessStatus(id)
    // Approved or turned down: the answer stands; only a waiting request is (re)filed.
    if (status === 'approved' || status === 'rejected') return json({ status })
    await writeJson(requestPath(id), { username, note, at: new Date().toISOString() })
    clearAccessCache()
    return json({ status: 'pending' })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}
