import { accessStatus, accountOf, approvalOn, claimAccount, clearAccessCache, ID, requestPath, requireApproved, StorageError, storedAuth, tokenMatches, TOKEN, writeJson, type AccessStatus } from './_account.js'
import { addFriend, friendsOf, normalizeCode, publishCard, removeFriend } from './_friends.js'
import { fromApp } from './_origin.js'
import { ensureProfile, saveVault, supabaseOn, supabaseUser, vaultOf } from './_supabase.js'
import { overLimit, tooMany } from './_rate.js'

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
 *
 * Friends (approved accounts; see _friends.ts), here because Vercel Hobby's twelve functions are all taken:
 * GET  /api/access?friends=1&today=YYYY-MM-DD  → { me, friends }: the own card (with its code) and the followed ones
 * POST /api/access  { action: 'friends-publish', name, avatar, color, days, streak, level, today } → { me }
 * POST /api/access  { action: 'friends-add' | 'friends-remove', code } → { ok } or { error }
 *
 * Supabase sign-in (see _supabase.ts), with `Authorization: Bearer <Supabase access token>`:
 * GET  /api/access?vault=1 → { account: { id, enc, auth, username } | null }: the person's sync account
 * POST /api/access  { action: 'vault-link', id, enc, auth, username?, note? } → { status }
 *   ties a sync account to the person: a new one (claimed here) or the one they had (its token must
 *   match the claim). A person keeps one sync account; one sync account belongs to one person.
 */
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

/** The reader's own date (their "today"), or the server's when it sends none. */
const todayOf = (raw: unknown) => (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10))

/** Friends need an account (its token checked) and, when approval is on, the owner's approval. */
async function friendAccount(request: Request): Promise<string | Response> {
  const refused = await requireApproved(request)
  if (refused) return refused
  const id = await accountOf(request)
  return id ?? json({ error: 'account_required' }, 403)
}

async function friendsGet(request: Request): Promise<Response> {
  if (overLimit(request, 'friends-read', 120)) return tooMany()
  try {
    const id = await friendAccount(request)
    if (id instanceof Response) return id
    return json(await friendsOf(id, todayOf(new URL(request.url).searchParams.get('today'))))
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

async function friendsPost(request: Request, body: Record<string, unknown>): Promise<Response> {
  if (overLimit(request, 'friends-write', 60)) return tooMany()
  try {
    const id = await friendAccount(request)
    if (id instanceof Response) return id
    if (body.action === 'friends-publish') return json({ me: await publishCard(id, body, todayOf(body.today)) })
    const code = normalizeCode(body.code)
    if (body.action === 'friends-remove') {
      await removeFriend(id, code)
      return json({ ok: true })
    }
    const result = await addFriend(id, code)
    return result === 'ok' ? json({ ok: true }) : json({ error: result }, result === 'full' ? 409 : 400)
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

async function vaultGet(request: Request): Promise<Response> {
  if (!supabaseOn()) return json({ error: 'not configured' }, 503)
  if (overLimit(request, 'vault-read', 60)) return tooMany()
  const user = await supabaseUser(request)
  if (!user) return json({ error: 'signed_out' }, 401)
  try {
    return json({ account: await vaultOf(user.id) })
  } catch {
    return json({ error: 'supabase unavailable' }, 502)
  }
}

async function vaultLink(request: Request, body: Record<string, unknown>): Promise<Response> {
  if (!supabaseOn()) return json({ error: 'not configured' }, 503)
  if (overLimit(request, 'vault-write', 10)) return tooMany()
  const user = await supabaseUser(request)
  if (!user) return json({ error: 'signed_out' }, 401)
  const { id, enc, auth } = body
  if (typeof id !== 'string' || typeof enc !== 'string' || typeof auth !== 'string' || !ID.test(id) || !TOKEN.test(enc) || !TOKEN.test(auth)) return json({ error: 'bad request' }, 400)
  const username = typeof body.username === 'string' && /^[\p{L}\p{N}._-]{3,32}$/u.test(body.username.trim()) ? body.username.trim() : ''
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : ''
  try {
    const had = await vaultOf(user.id)
    if (had && had.id !== id) return json({ error: 'linked' }, 409)
    // A new sync account is claimed for this token; an old one must be the token's (its password was right).
    if (!(await claimAccount(id, auth))) return json({ error: 'wrong' }, 403)
    await ensureProfile(user)
    if ((await saveVault(user.id, { id, enc, auth, username })) === 'taken') return json({ error: 'taken' }, 409)
    if (!approvalOn()) return json({ status: 'approved' })
    clearAccessCache()
    const status = await accessStatus(id)
    // The owner sees the person on the Yönetici card too, as with the old sign-up.
    if (status !== 'approved' && status !== 'rejected') await writeJson(requestPath(id), { username: username || user.name, note: note || user.email, at: new Date().toISOString() })
    return json({ status: status === 'none' ? 'pending' : status })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    return json({ error: 'supabase unavailable' }, 502)
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  if (new URL(request.url).searchParams.has('friends')) return friendsGet(request)
  if (new URL(request.url).searchParams.has('vault')) return vaultGet(request)
  if (overLimit(request, 'access-read', 120)) return tooMany()
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
  const body = (await request.json().catch(() => null)) as { action?: unknown; username?: unknown; note?: unknown } | null
  if (typeof body?.action === 'string' && body.action.startsWith('friends-')) return friendsPost(request, body as Record<string, unknown>)
  if (body?.action === 'vault-link') return vaultLink(request, body as Record<string, unknown>)
  // Filing a request writes to the store: a person asks once or twice, a script thousands of times.
  if (overLimit(request, 'access-write', 10)) return tooMany()
  const id = request.headers.get('x-sync-id') ?? ''
  const token = request.headers.get('x-sync-auth') ?? ''
  if (!ID.test(id) || !TOKEN.test(token)) return json({ error: 'bad request' }, 400)
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
