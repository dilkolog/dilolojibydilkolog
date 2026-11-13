import { accessStatus, approvalOn, claimAccount, clearAccessCache, ID, requestPath, requireApproved, StorageError, storedAuth, tokenMatches, TOKEN, writeJson, type AccessStatus } from './_account.js'
import { fromApp } from './_origin.js'
import { supabaseOn } from './_supabase.js'
import { overLimit, tooMany } from './_rate.js'
import { currentAnnouncement, getSettings } from './_settings.js'
import { usageLast } from './_usage.js'
import { listReports, ownerAuthorized, unpublishList } from './_owner.js'
import { issueRoomTicket, roomTicketsOn } from './_roomTicket.js'

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
 * Friends (approved accounts; see _friends.ts), here because the endpoints were once limited to twelve Vercel functions:
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
 * GET  /api/access?room-ticket=1                  → { ticket }: what a live room's WebSocket must name (`&t=`), or null when rooms ask for none
 *
 * Supabase sign-in (see _supabase.ts), with `Authorization: Bearer <Supabase access token>`:
 * GET  /api/access?vault=1 → { account: { id, enc, auth, username } | null }: the person's sync account
 * POST /api/access  { action: 'vault-link', id, enc, auth, username?, note? } → { status }
 * POST /api/access  { action: 'vault-rotate' } → { account }: a new sync token (the old one stops working; signed-in devices fetch the new one)
 *   ties a sync account to the person: a new one (claimed here) or the one they had (its token must
 *   match the claim). A person keeps one sync account; one sync account belongs to one person.
 * POST /api/access  { action: 'account-delete' } → { ok, removed }
 *   with the Supabase bearer (the person and their sync account) or the old x-sync-id/x-sync-auth
 *   (the account its password proves): deletes what the server keeps for it (_deleteAccount.ts).
 */
import { friendsGet, friendsPost, report } from './_accessFriends.js'
import { accountDelete, vaultGet, vaultLink, vaultRotate } from './_accessVault.js'

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

/** The owner's read-only view (REPORTS_TOKEN): `?owner=reports&days=N` → the last days' reports and the social use counters. */
async function ownerGet(request: Request, q: URLSearchParams): Promise<Response> {
  if (overLimit(request, 'owner', 20)) return tooMany()
  // Not there at all without the secret set, and a wrong one looks the same.
  if (!(await ownerAuthorized(request))) return json({ error: 'not found' }, 404)
  const days = Math.min(30, Math.max(1, Math.floor(Number(q.get('days'))) || 7))
  try {
    const [reports, usage] = await Promise.all([listReports(days), usageLast(days)])
    return json({ reports, usage })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const q = new URL(request.url).searchParams
  // The owner's announcement (admin screen), for everyone's bell: public text, nothing about anyone.
  if (q.has('news')) {
    if (overLimit(request, 'access-news', 30)) return tooMany()
    return json({ announcement: await currentAnnouncement().catch(() => null) })
  }
  // Which ways in the sign-in page offers besides e-mail and Google (the owner's switches).
  if (q.has('signin')) {
    if (overLimit(request, 'access-signin', 60)) return tooMany()
    const settings = await getSettings().catch(() => ({ facebookLogin: false }))
    return json({ facebook: settings.facebookLogin === true })
  }
  if (q.has('owner')) return ownerGet(request, q)
  // A ticket for a live room (_roomTicket.ts): an approved account, as for the other features; null when rooms ask for none.
  if (q.has('room-ticket')) {
    if (overLimit(request, 'room-ticket', 30)) return tooMany()
    if (!roomTicketsOn()) return json({ ticket: null })
    const denied = await requireApproved(request)
    if (denied) return denied
    return json({ ticket: await issueRoomTicket() })
  }
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
  if (body?.action === 'owner-unpublish') {
    if (overLimit(request, 'owner', 20)) return tooMany()
    if (!(await ownerAuthorized(request))) return json({ error: 'not found' }, 404)
    return (await unpublishList(String((body as { id?: unknown }).id ?? '').toLowerCase())) ? json({ ok: true }) : json({ error: 'bad_request' }, 400)
  }
  if (typeof body?.action === 'string' && body.action.startsWith('friends-')) return friendsPost(request, body as Record<string, unknown>)
  if (body?.action === 'vault-link') return vaultLink(request, body as Record<string, unknown>)
  if (body?.action === 'vault-rotate') return vaultRotate(request)
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
