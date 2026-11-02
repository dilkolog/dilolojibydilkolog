import { put } from '@vercel/blob'
import { readText, removeBlob, writeJson } from './_account.js'
import { type InboxItem, deliver, readInbox, withInbox } from './_friendInbox.js'
import { friendStore, readJson } from './_friendStore.js'
import { blockedBy, ownCard } from './_friends.js'

// ---------------------------------------------------------------------------
// Finding a friend by a chosen @name instead of a code. Only a name the person picked and switched on can be
// found (an exact match: no listing, no e-mail, no real name), and a find only lets one send a *request*: the
// other side sees it in their inbox and becomes a friend only by accepting (a code or an invite link, which
// the owner handed out on purpose, still adds at once).
// Kept in Blob files in both modes (a few hundred bytes each, no table or migration needed):
//   friends/handle/<name>.json   → { id }  (who holds the name)
//   friends/handle-of/<id>.json  → { handle, findable }
// ---------------------------------------------------------------------------

export const HANDLE = /^[a-z0-9_]{3,20}$/
const RESERVED = new Set(['admin', 'diloloji', 'destek', 'support', 'help', 'root', 'monki', 'moderator'])
const handlePath = (handle: string) => `friends/handle/${handle}.json`
export const handleOfPath = (id: string) => `friends/handle-of/${id}.json`

/** A name typed with an @, capitals or spaces around it is the same name. */
export const normalizeHandle = (raw: unknown): string => (typeof raw === 'string' ? raw.trim().replace(/^@/, '').toLowerCase() : '')

export interface HandleInfo {
  handle: string
  findable: boolean
}

export async function handleOf(id: string): Promise<HandleInfo | null> {
  const mine = await readJson<{ handle?: string; findable?: boolean }>(handleOfPath(id))
  return mine?.handle && HANDLE.test(mine.handle) ? { handle: mine.handle, findable: mine.findable === true } : null
}

export type HandleResult = 'ok' | 'bad_handle' | 'taken' | 'locked'

/** Picks the account's name (once: a chosen name stays, 'locked') and whether it can be found. A name held by another account is 'taken'. */
export async function setHandle(id: string, rawHandle: unknown, findable: unknown): Promise<HandleResult> {
  const handle = normalizeHandle(rawHandle)
  if (!HANDLE.test(handle) || RESERVED.has(handle)) return 'bad_handle'
  const held = await readJson<{ id?: string }>(handlePath(handle))
  if (held?.id && held.id !== id) return 'taken'
  const previous = await handleOf(id)
  // The name is chosen once; only whether it can be found changes afterwards.
  if (previous && previous.handle !== handle) return 'locked'
  // Two accounts claiming one free name at the same moment: only the first write creates the file, the other is told it is taken.
  if (!held?.id && !(await createJson(handlePath(handle), { id })) && (await readJson<{ id?: string }>(handlePath(handle)))?.id !== id) return 'taken'
  await writeJson(handleOfPath(id), { handle, findable: findable === true })
  return 'ok'
}

/** Writes a file only if there is none yet; false when one was already there. */
async function createJson(path: string, value: unknown): Promise<boolean> {
  try {
    await put(path, JSON.stringify(value), { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' })
    return true
  } catch (e) {
    if (await readText(path)) return false
    throw e
  }
}

/** Frees a name, but only while this account holds it: a name another account has since taken stays theirs. */
export async function releaseHandle(handle: string, id: string, strict = false): Promise<void> {
  if ((await readJson<{ id?: string }>(handlePath(handle)))?.id === id) await removeBlob(handlePath(handle), strict)
}

/** What a search shows of a person: only what their card shows a friend, never an id or a code. */
export interface FoundFriend {
  handle: string
  name: string
  avatar: string
  color: string
  level: number
}

/** The account behind a name, if it is switched on for finding. */
async function findableOwner(rawHandle: unknown): Promise<{ owner: string; handle: string } | null> {
  const handle = normalizeHandle(rawHandle)
  if (!HANDLE.test(handle)) return null
  const owner = (await readJson<{ id?: string }>(handlePath(handle)))?.id
  if (!owner) return null
  const info = await handleOf(owner)
  return info && info.handle === handle && info.findable ? { owner, handle } : null
}

export async function findFriend(id: string, rawHandle: unknown): Promise<FoundFriend | null> {
  const found = await findableOwner(rawHandle)
  if (!found || found.owner === id) return null
  const card = await (await friendStore()).card(found.owner)
  if (!card?.code) return null
  return { handle: found.handle, name: card.name, avatar: card.avatar, color: card.color, level: card.level }
}

export type RequestResult = 'ok' | 'unknown' | 'self' | 'already'

/** A friend request to the holder of a findable name: a message in their inbox, nothing more until they accept. */
export async function requestFriend(id: string, rawHandle: unknown, onDelivered?: (recipient: string, item: InboxItem) => Promise<unknown>): Promise<RequestResult> {
  const found = await findableOwner(rawHandle)
  if (!found) return 'unknown'
  if (found.owner === id) return 'self'
  const store = await friendStore()
  const [me, theirs] = await Promise.all([ownCard(id), store.card(found.owner)])
  if (!theirs?.code) return 'unknown'
  const [mine, theirFollows] = await Promise.all([store.follows(id), store.follows(found.owner)])
  if (mine.includes(theirs.code) || theirFollows.includes(me.code)) return 'already'
  // Taken off their friends: the request is quietly dropped (the answer does not tell them so).
  if ((await blockedBy(found.owner)).includes(me.code)) return 'ok'
  const now = new Date()
  // Asking again (while the first request waits, or soon after it was turned away) sends nothing and rings nothing:
  // a stranger must not be able to fill someone's inbox and phone with requests. The answer is the same 'ok'.
  const asked = await readJson<Record<string, string>>(requestsPath(found.owner)).catch(() => null)
  const last = asked?.[me.code] ? new Date(asked[me.code]!).getTime() : NaN
  if (now.getTime() - last < REQUEST_AGAIN_MS) return 'ok'
  if ((await readInbox(found.owner)).some((i) => i.kind === 'request' && i.from.code === me.code)) return 'ok'
  let delivered = null as InboxItem | null
  await withInbox(found.owner, () => deliver(found.owner, me, 'request', null, null, now, now.toISOString().slice(0, 10), (item) => (delivered = item)))
  const recent = Object.fromEntries(Object.entries(asked ?? {}).filter(([, at]) => now.getTime() - new Date(at).getTime() < REQUEST_AGAIN_MS))
  await writeJson(requestsPath(found.owner), { ...recent, [me.code]: now.toISOString() }).catch(() => undefined)
  if (delivered && onDelivered) await onDelivered(found.owner, delivered).catch(() => {})
  return 'ok'
}

/** How long after a request the same sender's next one to the same person is let through. */
export const REQUEST_AGAIN_MS = 24 * 3600_000
/** When each sender last asked this person: sender code → time (only the last day's kept). */
export const requestsPath = (id: string) => `friends/requested/${id}.json`
