import { accountOf, requireApproved, StorageError } from './_account.js'
import { addFriend, blockedPeople, blockFriend, clearInbox, findFriend, friendsOf, handleOf, inboxOf, inviterCard, normalizeCode, publishCard, removeFriend, requestFriend, sendToFriend, setHandle, unblockFriend } from './_friends.js'
import { friendMessage, pushToOwner } from './_notify.js'
import { overLimit, tooMany } from './_rate.js'
import { fileReport } from './_reports.js'
import { countUse, USE_NAMES, type UseName } from './_usage.js'

/** The friends' and reports' half of /api/access (the endpoints are listed in access.ts). */
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

export async function friendsGet(request: Request): Promise<Response> {
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

export async function friendsPost(request: Request, body: Record<string, unknown>): Promise<Response> {
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
      if (sent === 'ok') void countUse('friend-request')
      return sent === 'ok' ? json({ ok: true }) : json({ error: sent }, sent === 'unknown' ? 404 : 400)
    }
    const code = normalizeCode(body.code)
    if (body.action === 'friends-send') {
      if (overLimit(request, 'friends-send', 20)) return tooMany()
      const sent = await sendToFriend(id, code, body.kind, body.payload, typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : undefined, (recipient, item) => pushToOwner(recipient, friendMessage(item)))
      const kindUsed = `friend-${String(body.kind)}`
      if (sent === 'ok' && (USE_NAMES as readonly string[]).includes(kindUsed)) void countUse(kindUsed as UseName)
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
    if (result === 'ok') void countUse('friend-add')
    return result === 'ok' ? json({ ok: true }) : json({ error: result }, result === 'full' ? 409 : 400)
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

/** A report on what someone sent (_reports.ts): an account only, a few a minute. */
export async function report(request: Request, body: Record<string, unknown>): Promise<Response> {
  if (overLimit(request, 'report', 10)) return tooMany()
  try {
    const id = await friendAccount(request)
    if (id instanceof Response) return id
    const result = await fileReport(id, body)
    if (result === 'ok') {
      void countUse('report')
      return json({ ok: true })
    }
    return json({ error: result }, result === 'not_found' ? 404 : result === 'too_many' ? 429 : 400)
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

