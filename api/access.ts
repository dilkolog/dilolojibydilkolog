import { accessStatus, accountOf, approvalOn, claimAccount, clearAccessCache, ID, requestPath, requireApproved, StorageError, storedAuth, tokenMatches, TOKEN, writeJson, type AccessStatus } from './_account.js'
import { addFriend, blockedPeople, blockFriend, clearInbox, findFriend, friendsOf, handleOf, inboxOf, inviterCard, normalizeCode, publishCard, removeFriend, requestFriend, sendToFriend, setHandle, unblockFriend } from './_friends.js'
import { friendMessage, pushToOwner } from './_notify.js'
import { fromApp } from './_origin.js'
import { deleteAccountData, timed } from './_deleteAccount.js'
import { deleteSupabaseMedia, deleteSupabaseUser, ensureProfile, mirrorApproval, saveVault, supabaseOn, supabaseUser, vaultOf } from './_supabase.js'
import { overLimit, tooMany } from './_rate.js'
import { noticeSignup } from './_signupNotice.js'
import { fileReport } from './_reports.js'

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
 * GET  /api/access?inbox=1                        → { items }: what friends sent (a cheer, a nudge, a word, a text)
 * GET  /api/access?friend-handle=1                → { handle, findable } (the own findable @name, if one was picked)
 * GET  /api/access?friend-find=<name>             → { found } or 404 { error: 'unknown' }: an exact, switched-on name only
 * GET  /api/access?friend-invite=<CODE>           → { inviter } (name, avatar, colour, level) or 404/400: who an invite is from, before it is accepted
 * POST /api/access  { action: 'friends-handle', handle, findable } → { handle, findable } or { error: 'taken' | 'bad_handle' | 'locked' }
 * POST /api/access  { action: 'friends-request', handle } → { ok } or { error: 'unknown' | 'self' | 'already' } (a request the other side accepts)
 * POST /api/access  { action: 'friends-send', code, kind, payload? } → { ok } or { error } (kind: cheer, nudge, gift (a word), text); { action: 'friends-inbox-clear', ids } → { ok }
 * GET  /api/access?blocked=1                     → { people }: the block list (code, name, avatar, colour)
 * POST /api/access  { action: 'friends-block' | 'friends-unblock', code } → { ok }: block (off the friends both ways, their
 *   waiting messages gone, no way back by code, link or request) or lift a block
 * POST /api/access  { action: 'report', kind: 'user' | 'message' | 'set' | 'club', target, reason, note?, shown? } → { ok }
 *   or { error: 'bad_request' | 'not_found' | 'too_many' }: a report to the owner (_reports.ts)
 *
 * Supabase sign-in (see _supabase.ts), with `Authorization: Bearer <Supabase access token>`:
 * GET  /api/access?vault=1 → { account: { id, enc, auth, username } | null }: the person's sync account
 * POST /api/access  { action: 'vault-link', id, enc, auth, username?, note? } → { status }
 *   ties a sync account to the person: a new one (claimed here) or the one they had (its token must
 *   match the claim). A person keeps one sync account; one sync account belongs to one person.
 * POST /api/access  { action: 'account-delete' } → { ok, removed }
 *   with the Supabase bearer (the person and their sync account) or the old x-sync-id/x-sync-auth
 *   (the account its password proves): deletes what the server keeps for it (_deleteAccount.ts).
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
    const query = new URL(request.url).searchParams
    if (query.has('inbox')) return json({ items: await inboxOf(id) })
    if (query.has('blocked')) return json({ people: await blockedPeople(id) })
    if (query.has('friend-handle')) return json((await handleOf(id)) ?? { handle: '', findable: false })
    if (query.has('friend-invite')) {
      if (overLimit(request, 'friends-find', 30)) return tooMany()
      const inviter = await inviterCard(id, query.get('friend-invite') ?? '')
      if (inviter === 'self') return json({ error: 'self' }, 400)
      return inviter ? json({ inviter }) : json({ error: 'unknown' }, 404)
    }
    if (query.has('friend-find')) {
      if (overLimit(request, 'friends-find', 30)) return tooMany()
      const found = await findFriend(id, query.get('friend-find'))
      return found ? json({ found }) : json({ error: 'unknown' }, 404)
    }
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
    if (body.action === 'friends-inbox-clear') {
      await clearInbox(id, body.ids)
      return json({ ok: true })
    }
    if (body.action === 'friends-handle') {
      const result = await setHandle(id, body.handle, body.findable)
      if (result !== 'ok') return json({ error: result }, result === 'taken' || result === 'locked' ? 409 : 400)
      return json((await handleOf(id)) ?? { handle: '', findable: false })
    }
    if (body.action === 'friends-request') {
      if (overLimit(request, 'friends-send', 20)) return tooMany()
      const sent = await requestFriend(id, body.handle, (recipient, item) => pushToOwner(recipient, friendMessage(item)))
      return sent === 'ok' ? json({ ok: true }) : json({ error: sent }, sent === 'unknown' ? 404 : 400)
    }
    const code = normalizeCode(body.code)
    if (body.action === 'friends-send') {
      if (overLimit(request, 'friends-send', 20)) return tooMany()
      const sent = await sendToFriend(id, code, body.kind, body.payload, typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : undefined, (recipient, item) => pushToOwner(recipient, friendMessage(item)))
      return sent === 'ok' ? json({ ok: true }) : json({ error: sent }, sent === 'not_friends' ? 403 : 400)
    }
    if (body.action === 'friends-remove') {
      await removeFriend(id, code)
      return json({ ok: true })
    }
    if (body.action === 'friends-block' || body.action === 'friends-unblock') {
      await (body.action === 'friends-block' ? blockFriend : unblockFriend)(id, code)
      return json({ ok: true })
    }
    const result = await addFriend(id, code)
    return result === 'ok' ? json({ ok: true }) : json({ error: result }, result === 'full' ? 409 : 400)
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

/** A report on what someone sent (_reports.ts): an account only, a few a minute. */
async function report(request: Request, body: Record<string, unknown>): Promise<Response> {
  if (overLimit(request, 'report', 10)) return tooMany()
  try {
    const id = await friendAccount(request)
    if (id instanceof Response) return id
    const result = await fileReport(id, body)
    if (result === 'ok') return json({ ok: true })
    return json({ error: result }, result === 'not_found' ? 404 : result === 'too_many' ? 429 : 400)
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
    const account = await vaultOf(user.id)
    // The owner may have approved the sync account the old way: the profile follows, so its data may be written.
    if (account) {
      // A storage hiccup must not read as "not approved": the profile is only written when the status was really read.
      const status = await accessStatus(account.id).catch(() => null)
      if (status) await mirrorApproval(account.id, status)
    }
    return json({ account })
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
    // A person's first sign-in (their account was just linked): the owner hears of it.
    if (!had) await noticeSignup({ email: user.email, name: user.name, username })
    if (!approvalOn()) {
      await mirrorApproval(id, 'approved')
      return json({ status: 'approved' })
    }
    clearAccessCache()
    const status = await accessStatus(id)
    await mirrorApproval(id, status)
    // The owner sees the person on the Yönetici card too, as with the old sign-up.
    if (status !== 'approved' && status !== 'rejected') await writeJson(requestPath(id), { username: username || user.name, note: note || user.email, at: new Date().toISOString() })
    return json({ status: status === 'none' ? 'pending' : status })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    return json({ error: 'supabase unavailable' }, 502)
  }
}

async function accountDelete(request: Request): Promise<Response> {
  if (overLimit(request, 'account-delete', 5)) return tooMany()
  try {
    // With Supabase the person's own sign-in is what deletes them: the legacy token alone would leave their Supabase data behind.
    if (supabaseOn() && !request.headers.has('authorization')) return json({ error: 'signed_out' }, 401)
    const user = request.headers.has('authorization') ? await supabaseUser(request) : null
    if (request.headers.has('authorization') && !user) return json({ error: 'signed_out' }, 401)
    const id = user ? ((await vaultOf(user.id))?.id ?? null) : await accountOf(request)
    if (!user && !id) return json({ error: 'account_required' }, 403)
    // The server's stores and the person's Supabase files are separate: they go side by side. The person themselves
    // go last, so a failure before that leaves the account to try again (nothing is orphaned without its sign-in).
    const steps: Record<string, number> = {}
    const [removed] = await Promise.all([
      id ? timed(steps, 'data', () => deleteAccountData(id, steps)) : Promise.resolve(0),
      user ? timed(steps, 'media', () => deleteSupabaseMedia(user.id).catch(() => undefined)) : Promise.resolve(),
    ])
    if (user) await timed(steps, 'user', () => deleteSupabaseUser(user.id))
    // Where the time went, in the Worker's logs: a slow deletion names its slow step.
    console.log('[account-delete]', JSON.stringify(steps))
    return json({ ok: true, removed })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    return json({ error: 'delete failed' }, 502)
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const q = new URL(request.url).searchParams
  if (q.has('friends') || q.has('inbox') || q.has('blocked') || q.has('friend-handle') || q.has('friend-find') || q.has('friend-invite')) return friendsGet(request)
  if (new URL(request.url).searchParams.has('vault')) return vaultGet(request)
  if (overLimit(request, 'access-read', 120)) return tooMany()
  const id = request.headers.get('x-sync-id') ?? ''
  const token = request.headers.get('x-sync-auth') ?? ''
  // No account named: whether approval is asked for at all (a visitor's screens depend on it).
  if (!id && !token) return json({ enabled: approvalOn(), status: 'none', exists: false, match: false })
  if (!ID.test(id) || !TOKEN.test(token)) return json({ error: 'bad request' }, 400)
  try {
    const claimed = !!(await storedAuth(id))
    const match = claimed && (await tokenMatches(id, token))
    const status: AccessStatus = match ? await accessStatus(id) : 'none'
    // "Is this name taken?" is only for the old username sign-up; with Supabase it would just tell a stranger
    // which usernames have an account, so a wrong token learns nothing.
    const exists = supabaseOn() ? match : claimed
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
  if (body?.action === 'account-delete') return accountDelete(request)
  if (body?.action === 'report') return report(request, body as Record<string, unknown>)
  // The old username sign-up is closed once sign-in moved to Supabase (the app asks there instead).
  if (supabaseOn()) return json({ error: 'sign in with supabase' }, 410)
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
