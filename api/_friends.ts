import { del, get, put } from '@vercel/blob'
import { readText, removeBlob, StorageError, writeJson } from './_account.js'
import { eq, inboxTableOn, rows, tablesOn, upsert, write } from './_tables.js'

/**
 * Friends: an account shares a small card of how it is doing (a name it chose, its avatar, the XP of its
 * last two weeks, its streak and level) under a friend code, and follows the friends whose codes it was
 * given. Following is one-way, like giving someone your number: they see you once they add your code.
 * The card carries nothing else: no words, no answers, no account id (the code stands in for it).
 *
 * Kept in Blob files or, once the owner moved them, Supabase tables (see FriendStore below).
 *
 * The app reaches this through /api/access (Vercel Hobby allows twelve functions, all taken).
 */

export const MAX_FRIENDS = 50
/** Days of XP a card keeps: enough for "this week" whatever day it is read. */
const KEPT_DAYS = 14
/** No 0/O, 1/I/L: a code read aloud or copied by hand comes out right. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const CODE = /^[2-9A-HJKMNP-Z]{8}$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

export interface FriendCard {
  code: string
  name: string
  avatar: string
  color: string
  /** XP by local date, the last two weeks. */
  days: Record<string, number>
  streak: number
  level: number
  at: string
}

/** What a friend sees of another: no dates beyond today and the week, no id. */
export interface FriendView {
  code: string
  name: string
  avatar: string
  color: string
  today: number
  week: number
  streak: number
  level: number
  /** The card's XP by local date (the last two weeks), for a friend's page and the weekly league. */
  days: Record<string, number>
  /** When the card was last updated (ISO). */
  at: string
}

/** A code typed with a dash, spaces or in lower case is the same code. */
export const normalizeCode = (raw: unknown): string => (typeof raw === 'string' ? raw.toUpperCase().replace(/[^0-9A-Z]/g, '') : '')

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
}

const int = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0)
const plain = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\p{Cc}<>]/gu, '').trim().slice(0, max) : '')

/** The card the app sends, checked and trimmed: only what the card holds, within limits. */
export function cleanCard(body: Record<string, unknown>, today: string): Omit<FriendCard, 'code' | 'at'> {
  const days: Record<string, number> = {}
  const raw = body.days && typeof body.days === 'object' ? (body.days as Record<string, unknown>) : {}
  const oldest = new Date(new Date(`${today}T12:00:00Z`).getTime() - (KEPT_DAYS - 1) * 86_400_000).toISOString().slice(0, 10)
  for (const [day, xp] of Object.entries(raw)) if (DAY.test(day) && day >= oldest && day <= today) days[day] = int(xp, 100_000)
  const avatar = plain(body.avatar, 24)
  const color = typeof body.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : '#6366f1'
  return { name: plain(body.name, 24) || 'Arkadaş', avatar, color, days, streak: int(body.streak, 100_000), level: int(body.level, 10_000) }
}

/** Finds the username on record for an account (from sync_keys in Supabase, or approval/request in Blob store). */
export async function resolveAccountName(id: string): Promise<string | null> {
  if (!id) return null
  try {
    if (await tablesOn()) {
      const keyRows = await rows<{ username: string | null }>(`sync_keys?sync_id=${eq(id)}&select=username`)
      if (keyRows[0]?.username?.trim()) return keyRows[0].username.trim()
    }
  } catch {
    // Supabase tables might not be active or row missing
  }
  try {
    const approved = await readJson<{ username?: string }>(`access/approved/${id}.json`)
    if (approved?.username?.trim()) return approved.username.trim()
    const req = await readJson<{ username?: string }>(`access/requests/${id}.json`)
    if (req?.username?.trim()) return req.username.trim()
  } catch {
    // Blob read failed
  }
  return null
}

/** The account's card, made (with a fresh code) the first time. */
export async function ownCard(id: string): Promise<FriendCard> {
  const store = await friendStore()
  const card = await store.card(id)
  if (card?.code) {
    if (!card.name || card.name === 'Arkadaş') {
      const realName = await resolveAccountName(id)
      if (realName) {
        card.name = realName
        void store.save(id, card).catch(() => undefined)
      }
    }
    return card
  }
  const defaultName = (await resolveAccountName(id)) || 'Arkadaş'
  for (let i = 0; i < 5; i++) {
    const fresh: FriendCard = { code: newCode(), name: defaultName, avatar: '', color: '#6366f1', days: {}, streak: 0, level: 1, at: new Date().toISOString() }
    const made = await store.create(id, fresh)
    if (made === 'ok') return fresh
    // Made at the same moment by another request of this account: that one stands.
    if (made === 'exists') {
      const there = await store.card(id)
      if (there?.code) return there
    }
  }
  throw new StorageError('no free code')
}

export async function publishCard(id: string, body: Record<string, unknown>, today: string): Promise<FriendCard> {
  const card = await ownCard(id)
  const cleaned = cleanCard(body, today)
  if (!cleaned.name || cleaned.name === 'Arkadaş') {
    const fallback = (await resolveAccountName(id)) || (card.name !== 'Arkadaş' ? card.name : '')
    if (fallback) cleaned.name = fallback
  }
  const next: FriendCard = { ...card, ...cleaned, code: card.code, at: new Date().toISOString() }
  await (await friendStore()).save(id, next)
  return next
}

/** Follows the code's owner. Errors: unknown code, one's own code, too many friends. */
export async function addFriend(id: string, code: string): Promise<'ok' | 'unknown' | 'self' | 'full'> {
  if (!CODE.test(code)) return 'unknown'
  const store = await friendStore()
  const owner = await store.ownerOf(code)
  if (!owner) return 'unknown'
  if (owner === id) return 'self'
  const [codes, myCard] = await Promise.all([store.follows(id), ownCard(id)])
  if (codes.includes(code)) return 'ok'
  if (codes.length >= MAX_FRIENDS) return 'full'
  await store.follow(id, code, codes)
  // Mutual friendship: also follow back so the friend sees the learner immediately
  if (myCard?.code) {
    const ownerCodes = await store.follows(owner)
    if (!ownerCodes.includes(myCard.code) && ownerCodes.length < MAX_FRIENDS) {
      await store.follow(owner, myCard.code, ownerCodes)
    }
  }
  return 'ok'
}

export async function removeFriend(id: string, code: string): Promise<void> {
  const store = await friendStore()
  const [codes, owner, myCard] = await Promise.all([store.follows(id), store.ownerOf(code), ownCard(id)])
  if (codes.includes(code)) await store.unfollow(id, code, codes)
  if (owner && myCard?.code) {
    const ownerCodes = await store.follows(owner)
    if (ownerCodes.includes(myCard.code)) await store.unfollow(owner, myCard.code, ownerCodes)
  }
}

/** A card as a friend sees it, "today" and "this week" by the reader's own date. */
export function viewOf(card: FriendCard, today: string): FriendView {
  const weekStart = new Date(new Date(`${today}T12:00:00Z`).getTime() - 6 * 86_400_000).toISOString().slice(0, 10)
  const week = Object.entries(card.days).reduce((n, [d, xp]) => (d >= weekStart && d <= today ? n + xp : n), 0)
  const days = Object.fromEntries(Object.entries(card.days).filter(([d]) => d <= today))
  return { code: card.code, name: card.name, avatar: card.avatar, color: card.color, today: card.days[today] ?? 0, week, streak: card.streak, level: card.level, days, at: card.at }
}

/** The account's own card and those of whom it follows (a code whose card is gone is left out). */
export async function friendsOf(id: string, today: string): Promise<{ me: FriendView; friends: FriendView[] }> {
  const store = await friendStore()
  const me = await ownCard(id)
  const [following, followers] = await Promise.all([
    store.follows(id),
    store.followers ? store.followers(me.code).catch(() => [] as string[]) : Promise.resolve([] as string[]),
  ])
  // Merge both directions so if a friend added me, I see them even before explicitly adding them back
  const merged = [...new Set([...following, ...followers])].filter((c) => c !== me.code).slice(0, MAX_FRIENDS)

  // Asynchronously backfill follow relationship for any follower not yet in following list
  for (const fCode of followers) {
    if (!following.includes(fCode) && following.length < MAX_FRIENDS) {
      void store.follow(id, fCode, following).catch(() => undefined)
    }
  }

  const cards = await store.cardsOf(merged)
  return { me: viewOf(me, today), friends: cards.filter((c) => !!c?.code).map((c) => viewOf(c, today)) }
}

/** Takes the account's card, its code and whom it follows off the store (the account is being deleted). */
export async function forgetFriends(id: string): Promise<void> {
  // Both places: an account deleted soon after the move must leave nothing behind in either.
  const handle = await handleOf(id).catch(() => null)
  await Promise.all([handle ? releaseHandle(handle.handle, id) : Promise.resolve(), removeBlob(handleOfPath(id)), removeBlob(requestsPath(id))])
  // Not swallowed: a deletion that left the messages behind must fail (and can be tried again).
  if (await inboxTableOn()) await write(`friend_inbox?sync_id=${eq(id)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  await Promise.all([blobFriends.forget(id), removeBlob(inboxPath(id)), (await tablesOn()) ? tableFriends.forget(id) : Promise.resolve()])
}

// ---------------------------------------------------------------------------
// The friends' inbox: a cheer, a nudge, (later) a gift word or a text, from one friend to another.
// Kept in Blob files in both modes (a few hundred bytes per person, so no table needed).
// ---------------------------------------------------------------------------

export type InboxKind = 'cheer' | 'nudge' | 'gift' | 'text' | 'joined' | 'request'
export const INBOX_KINDS: readonly InboxKind[] = ['cheer', 'nudge', 'gift', 'text', 'joined', 'request']
const MAX_INBOX = 30
const KEEP_DAYS = 30
/** A friend can have this many gifts (and as many texts) waiting from the same sender: more would be spam. */
const PENDING_PER_SENDER = 5
const LANGUAGES = ['en', 'fr', 'es']

/** A word given to a friend, with its meaning and a sentence if there is one. */
export interface GiftWord {
  language: string
  lemma: string
  meaning: string
  example?: string
  exampleTranslation?: string
}

/** A short text sent to a friend to read. */
export interface SentText {
  language: string
  title: string
  body: string
}

export interface InboxItem {
  id: string
  kind: InboxKind
  from: { code: string; name: string }
  at: string
  gift?: GiftWord
  text?: SentText
}

const MAX_BODY = 3000
const MIN_BODY = 30

/** The gift as sent, checked and trimmed; null when it is not a word with a meaning. */
export function cleanGift(raw: unknown): GiftWord | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as Record<string, unknown>
  const language = typeof g.language === 'string' && LANGUAGES.includes(g.language) ? g.language : ''
  const lemma = plain(g.lemma, 60)
  const meaning = plain(g.meaning, 120)
  if (!language || !lemma || !meaning) return null
  const example = plain(g.example, 200)
  const exampleTranslation = plain(g.exampleTranslation, 200)
  return { language, lemma, meaning, ...(example ? { example } : {}), ...(example && exampleTranslation ? { exampleTranslation } : {}) }
}

/** The text as sent, checked and trimmed; null when it is too short to be one. */
export function cleanText(raw: unknown): SentText | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  const language = typeof t.language === 'string' && LANGUAGES.includes(t.language) ? t.language : ''
  const title = plain(t.title, 80)
  const body = typeof t.body === 'string' ? [...t.body].filter((c) => c === '\n' || (c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)).join('').replace(/[<>]/g, '').trim().slice(0, MAX_BODY) : ''
  if (!language || !title || body.length < MIN_BODY) return null
  return { language, title, body }
}

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
const handleOfPath = (id: string) => `friends/handle-of/${id}.json`

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

export type HandleResult = 'ok' | 'bad_handle' | 'taken'

/** Picks (or changes) the account's name and whether it can be found. A name held by another account is 'taken'. */
export async function setHandle(id: string, rawHandle: unknown, findable: unknown): Promise<HandleResult> {
  const handle = normalizeHandle(rawHandle)
  if (!HANDLE.test(handle) || RESERVED.has(handle)) return 'bad_handle'
  const held = await readJson<{ id?: string }>(handlePath(handle))
  if (held?.id && held.id !== id) return 'taken'
  const previous = await handleOf(id)
  // Two accounts claiming one free name at the same moment: only the first write creates the file, the other is told it is taken.
  if (!held?.id && !(await createJson(handlePath(handle), { id })) && (await readJson<{ id?: string }>(handlePath(handle)))?.id !== id) return 'taken'
  await writeJson(handleOfPath(id), { handle, findable: findable === true })
  if (previous && previous.handle !== handle) await releaseHandle(previous.handle, id)
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
async function releaseHandle(handle: string, id: string): Promise<void> {
  if ((await readJson<{ id?: string }>(handlePath(handle)))?.id === id) await removeBlob(handlePath(handle))
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
const requestsPath = (id: string) => `friends/requested/${id}.json`

const inboxPath = (id: string) => `friends/inbox/${id}.json`

/** The messages worth keeping from what was stored: well formed, not older than KEEP_DAYS. */
function keepable(items: unknown): InboxItem[] {
  const oldest = Date.now() - KEEP_DAYS * 86_400_000
  return Array.isArray(items) ? (items as InboxItem[]).filter((i) => i && typeof i.id === 'string' && INBOX_KINDS.includes(i.kind) && new Date(i.at).getTime() > oldest && (i.kind !== 'gift' || cleanGift(i.gift)) && (i.kind !== 'text' || cleanText(i.text))) : []
}

/** The inbox as stored, with the tag of the version read (null when there is no file yet). */
async function readInboxBlob(id: string): Promise<{ items: InboxItem[]; etag: string | null }> {
  let blob
  try {
    blob = await get(inboxPath(id), { access: 'private', useCache: false })
  } catch {
    throw new StorageError('storage unavailable')
  }
  if (!blob || blob.statusCode !== 200 || !blob.stream) return { items: [], etag: null }
  let items: unknown
  try {
    items = (JSON.parse(await new Response(blob.stream).text()) as { items?: unknown }).items
  } catch {
    items = []
  }
  return { items: keepable(items), etag: blob.blob?.etag ?? null }
}


/** Someone else wrote the file (or made it) since it was read. */
const wroteMeanwhile = (e: unknown) => /precondition|exist/i.test(`${(e as { name?: string })?.name ?? ''} ${(e as Error)?.message ?? ''}`)

/** How many times a change is tried again when another server instance wrote the inbox in between. */
const INBOX_TRIES = 6

/**
 * Changes an inbox as one read-modify-write: the file is written only if it is still the version that was read
 * (`If-Match`, or "does not exist yet"), otherwise the change is made again on what the other writer left. Together
 * with `withInbox` (same instance) this keeps two sends from two instances from undoing each other.
 * `change` returns the new list, or null for "nothing to write".
 */
async function changeInboxBlob(id: string, change: (items: InboxItem[]) => InboxItem[] | null): Promise<void> {
  for (let attempt = 0; attempt < INBOX_TRIES; attempt++) {
    const { items, etag } = await readInboxBlob(id)
    const next = change(items)
    if (!next) return
    try {
      await put(inboxPath(id), JSON.stringify({ items: next }), { access: 'private', addRandomSuffix: false, allowOverwrite: etag !== null, contentType: 'application/json', ...(etag ? { ifMatch: etag } : {}) })
      return
    } catch (e) {
      if (!wroteMeanwhile(e)) throw e
    }
  }
  throw new StorageError('inbox busy')
}


// The same inbox in a table (supabase/migrations/0004_friend_inbox.sql), once that migration was run: one row per
// message, so two writers cannot undo each other (a change only adds the rows it made and drops the rows it took).
interface InboxRow {
  id: string
  sync_id: string
  kind: InboxKind
  from_code: string
  from_name: string
  gift: GiftWord | null
  sent_text: SentText | null
  at: string
}
const INBOX_COLUMNS = 'id,sync_id,kind,from_code,from_name,gift,sent_text,at'
const rowOfItem = (recipient: string, i: InboxItem): InboxRow => ({ id: i.id, sync_id: recipient, kind: i.kind, from_code: i.from.code, from_name: i.from.name, gift: i.gift ?? null, sent_text: i.text ?? null, at: i.at })
const itemOfRow = (r: InboxRow): InboxItem => ({ id: r.id, kind: r.kind, from: { code: r.from_code, name: r.from_name }, at: new Date(r.at).toISOString(), ...(r.gift ? { gift: r.gift } : {}), ...(r.sent_text ? { text: r.sent_text } : {}) })
const cutoff = () => new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString()

/** Whom a server instance has found to have no Blob inbox (left from before the move): not asked again for a while. */
const noBlobInbox = new Map<string, number>()
const BLOB_CHECK_MS = 10 * 60_000
export const forgetLegacyChecks = () => noBlobInbox.clear()

/** What a person's Blob inbox still holds (before the move to the table it was the only place); none once it was carried over. */
async function legacyInbox(id: string): Promise<InboxItem[]> {
  if ((noBlobInbox.get(id) ?? 0) > Date.now()) return []
  const { items } = await readInboxBlob(id)
  if (!items.length) noBlobInbox.set(id, Date.now() + BLOB_CHECK_MS)
  return items
}

async function readInboxTable(id: string): Promise<InboxItem[]> {
  const [current, legacy] = await Promise.all([rows<InboxRow>(`friend_inbox?sync_id=${eq(id)}&at=gt.${encodeURIComponent(cutoff())}&select=${INBOX_COLUMNS}&order=at.desc&limit=${MAX_INBOX * 2}`), legacyInbox(id)])
  const have = new Set(current.map((r) => r.id))
  // Two server instances delivering at once can each leave a row the other did not count: the limit holds on reading too.
  return keepable([...current.map(itemOfRow), ...legacy.filter((i) => !have.has(i.id))])
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_INBOX)
}

async function changeInboxTable(id: string, change: (items: InboxItem[]) => InboxItem[] | null): Promise<void> {
  const [stored, legacy] = await Promise.all([rows<InboxRow>(`friend_inbox?sync_id=${eq(id)}&at=gt.${encodeURIComponent(cutoff())}&select=${INBOX_COLUMNS}&order=at.desc&limit=${MAX_INBOX * 2}`), legacyInbox(id)])
  const inTable = new Set(stored.map((r) => r.id))
  const current = keepable([...stored.map(itemOfRow), ...legacy.filter((i) => !inTable.has(i.id))])
  const next = change(current)
  if (!next) return
  const keep = new Set(next.map((i) => i.id))
  const add = next.filter((i) => !inTable.has(i.id))
  const drop = stored.filter((r) => !keep.has(r.id)).map((r) => r.id)
  if (add.length) await upsert('friend_inbox', 'id', add.map((i) => rowOfItem(id, i)), true)
  if (drop.length) await write(`friend_inbox?sync_id=${eq(id)}&id=in.(${drop.map(encodeURIComponent).join(',')})`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  // Past its days: swept along (best effort).
  void write(`friend_inbox?sync_id=${eq(id)}&at=lt.${encodeURIComponent(cutoff())}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } }).catch(() => undefined)
  // What was waiting in the Blob inbox is in the table now: the file goes.
  if (legacy.length) {
    // Only once the file is really gone: a failed removal leaves it to be carried over (and its dismissed messages dropped) next time.
    const removed = await del(inboxPath(id)).then(
      () => true,
      () => false,
    )
    if (removed) noBlobInbox.set(id, Date.now() + BLOB_CHECK_MS)
  }
}

const readInbox = async (id: string): Promise<InboxItem[]> => ((await inboxTableOn()) ? readInboxTable(id) : (await readInboxBlob(id)).items)
const changeInbox = async (id: string, change: (items: InboxItem[]) => InboxItem[] | null): Promise<void> => ((await inboxTableOn()) ? changeInboxTable(id, change) : changeInboxBlob(id, change))

/** What waits for the account, newest first. */
export async function inboxOf(id: string): Promise<InboxItem[]> {
  return (await readInbox(id)).sort((a, b) => b.at.localeCompare(a.at))
}

export type SendResult = 'ok' | 'unknown' | 'self' | 'not_friends' | 'bad_kind' | 'bad_payload' | 'studied'

/** One change to an inbox at a time (in this server instance): two sends, or a send and a clearing, would otherwise each read the same list and the second write would undo the first. */
const inboxLocks = new Map<string, Promise<unknown>>()
function withInbox<T>(id: string, change: () => Promise<T>): Promise<T> {
  const run = (inboxLocks.get(id) ?? Promise.resolve()).then(change, change)
  const tail = run.catch(() => undefined)
  inboxLocks.set(id, tail)
  void tail.then(() => {
    if (inboxLocks.get(id) === tail) inboxLocks.delete(id)
  })
  return run
}

/**
 * A cheer or a nudge for a friend. Only between friends (one of them follows the other), and one of a kind
 * per sender a day: a second replaces the first rather than piling up.
 */
export async function sendToFriend(
  id: string,
  toCode: string,
  kind: unknown,
  payload?: unknown,
  senderToday?: string,
  /** Called once the message is in the recipient's inbox (outside its lock): where a push notification is sent. Its failure changes nothing. */
  onDelivered?: (recipient: string, item: InboxItem) => Promise<unknown>,
): Promise<SendResult> {
  if (typeof kind !== 'string' || !INBOX_KINDS.includes(kind as InboxKind) || kind === 'request') return 'bad_kind'
  const gift = kind === 'gift' ? cleanGift(payload) : null
  const text = kind === 'text' ? cleanText(payload) : null
  if ((kind === 'gift' && !gift) || (kind === 'text' && !text)) return 'bad_payload'
  if (!CODE.test(toCode)) return 'unknown'
  const store = await friendStore()
  const [recipient, me] = await Promise.all([store.ownerOf(toCode), ownCard(id)])
  if (!recipient) return 'unknown'
  if (recipient === id) return 'self'
  const [mine, theirs] = await Promise.all([store.follows(id), store.follows(recipient)])
  if (!mine.includes(toCode) && !theirs.includes(me.code)) return 'not_friends'
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  // A nudge is for a friend who has not studied yet today (by the sender's date, which is the one the nudge is about).
  if (kind === 'nudge') {
    const [card] = await store.cardsOf([toCode])
    if ((card?.days?.[senderToday ?? today] ?? 0) > 0) return 'studied'
  }
  let delivered = null as InboxItem | null
  const result = await withInbox(recipient, () => deliver(recipient, me, kind as InboxKind, gift, text, now, today, (item) => (delivered = item)))
  if (result === 'ok' && delivered && onDelivered) await onDelivered(recipient, delivered).catch(() => {})
  return result
}

/** Puts one message in the recipient's inbox, in the place of the sender's earlier one of the day (a cheer, a nudge) or beside the few gifts and texts of theirs that are waiting. */
async function deliver(recipient: string, me: FriendCard, kind: InboxKind, gift: GiftWord | null, text: SentText | null, now: Date, today: string, onItem: (item: InboxItem) => void): Promise<SendResult> {
  const item: InboxItem = { id: crypto.randomUUID(), kind, from: { code: me.code, name: me.name }, at: now.toISOString(), ...(gift ? { gift } : {}), ...(text ? { text } : {}) }
  await changeInbox(recipient, (waiting) => {
    // A cheer or a nudge replaces the sender's one of the day, "joined" (a friend came in by your invite) the sender's one at all; gifts and texts pile up to a few.
    const sameKind = waiting.filter((i) => i.from.code === me.code && i.kind === kind)
    const dropped = new Set(
      kind === 'joined' || kind === 'request'
        ? sameKind.map((i) => i.id)
        : kind === 'cheer' || kind === 'nudge'
        ? sameKind.filter((i) => i.at.slice(0, 10) === today).map((i) => i.id)
        : [...sameKind].sort((a, b) => b.at.localeCompare(a.at)).slice(PENDING_PER_SENDER - 1).map((i) => i.id),
    )
    return [item, ...waiting.filter((i) => !dropped.has(i.id))].slice(0, MAX_INBOX)
  })
  onItem(item)
  return 'ok'
}

/** Takes the listed messages out of the account's inbox (read, or turned away). */
export async function clearInbox(id: string, ids: unknown): Promise<void> {
  if (!Array.isArray(ids)) return
  const drop = new Set(ids.filter((x): x is string => typeof x === 'string'))
  await withInbox(id, async () => {
    await changeInbox(id, (items) => {
      const left = items.filter((i) => !drop.has(i.id))
      return left.length !== items.length ? left : null
    })
  })
}

/** Where cards and follows are kept: Blob files, or (after the move) Supabase tables. */
export interface FriendStore {
  card(id: string): Promise<FriendCard | null>
  /** 'exists': the account has a card already; 'taken': the code belongs to another. */
  create(id: string, card: FriendCard): Promise<'ok' | 'exists' | 'taken'>
  save(id: string, card: FriendCard): Promise<void>
  ownerOf(code: string): Promise<string | null>
  /** Cards for the codes, in their order (unknown codes left out). */
  cardsOf(codes: string[]): Promise<FriendCard[]>
  follows(id: string): Promise<string[]>
  followers?(code: string): Promise<string[]>
  follow(id: string, code: string, current: string[]): Promise<void>
  unfollow(id: string, code: string, current: string[]): Promise<void>
  forget(id: string): Promise<void>
}

export const friendStore = async (): Promise<FriendStore> => ((await tablesOn()) ? tableFriends : blobFriends)

const cardPath = (id: string) => `friends/card/${id}.json`
const codePath = (code: string) => `friends/code/${code}.json`
const followPath = (id: string) => `friends/follow/${id}.json`

async function readJson<T>(path: string): Promise<T | null> {
  const text = await readText(path)
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/**
 * Kept in the Blob store:
 *   friends/card/<account id>.json   the account's own card, with its code
 *   friends/code/<CODE>.json         → { id } (the code's owner)
 *   friends/follow/<account id>.json → { codes } (whom it follows)
 */
export const blobFriends: FriendStore = {
  card: (id) => readJson<FriendCard>(cardPath(id)),
  async create(id, card) {
    if (await readText(codePath(card.code))) return 'taken'
    await writeJson(codePath(card.code), { id })
    await writeJson(cardPath(id), card)
    return 'ok'
  },
  save: (id, card) => writeJson(cardPath(id), card),
  ownerOf: async (code) => (await readJson<{ id?: string }>(codePath(code)))?.id ?? null,
  async cardsOf(codes) {
    const cards = await Promise.all(
      codes.map(async (code) => {
        const owner = await readJson<{ id?: string }>(codePath(code))
        if (!owner?.id) return null
        const c = await readJson<FriendCard>(cardPath(owner.id))
        if (!c?.code) return null
        if (!c.name || c.name === 'Arkadaş') {
          const resolved = await resolveAccountName(owner.id)
          if (resolved) {
            c.name = resolved
            void writeJson(cardPath(owner.id), c).catch(() => undefined)
          }
        }
        return c
      }),
    )
    return cards.filter((c): c is FriendCard => !!c?.code)
  },
  follows: async (id) => (await readJson<{ codes?: string[] }>(followPath(id)))?.codes?.filter((c) => CODE.test(c)) ?? [],
  followers: async (code) => (await readJson<{ codes?: string[] }>(`friends/follower/${code}.json`))?.codes?.filter((c) => CODE.test(c)) ?? [],
  async follow(id, code, current) {
    await writeJson(followPath(id), { codes: [...current, code] })
    const followers = (await readJson<{ codes?: string[] }>(`friends/follower/${code}.json`))?.codes ?? []
    const me = await readJson<FriendCard>(cardPath(id))
    if (me?.code && !followers.includes(me.code)) {
      await writeJson(`friends/follower/${code}.json`, { codes: [...followers, me.code] })
    }
  },
  async unfollow(id, code, current) {
    await writeJson(followPath(id), { codes: current.filter((c) => c !== code) })
    const followers = (await readJson<{ codes?: string[] }>(`friends/follower/${code}.json`))?.codes ?? []
    const me = await readJson<FriendCard>(cardPath(id))
    if (me?.code && followers.includes(me.code)) {
      await writeJson(`friends/follower/${code}.json`, { codes: followers.filter((c) => c !== me.code) })
    }
  },
  async forget(id) {
    const card = await readJson<FriendCard>(cardPath(id)).catch(() => null)
    await Promise.all([removeBlob(cardPath(id)), removeBlob(followPath(id)), card?.code ? removeBlob(codePath(card.code)) : Promise.resolve()])
  },
}

interface CardRow {
  sync_id: string
  code: string
  name: string
  avatar: string
  color: string
  days: Record<string, number>
  streak: number
  level: number
  updated_at: string
}

const CARD_COLUMNS = 'sync_id,code,name,avatar,color,days,streak,level,updated_at'
const cardOfRow = (r: CardRow): FriendCard => ({ code: r.code, name: r.name, avatar: r.avatar, color: r.color, days: r.days ?? {}, streak: r.streak, level: r.level, at: new Date(r.updated_at).toISOString() })
export const rowOfCard = (id: string, c: FriendCard): CardRow => ({ sync_id: id, code: c.code, name: c.name, avatar: c.avatar, color: c.color, days: c.days, streak: c.streak, level: c.level, updated_at: c.at })

/** The same in Supabase: friend_cards (one row per account, its code unique) and friend_follows (account, code). */
export const tableFriends: FriendStore = {
  card: async (id) => {
    const [row] = await rows<CardRow>(`friend_cards?sync_id=${eq(id)}&select=${CARD_COLUMNS}`)
    return row ? cardOfRow(row) : null
  },
  async create(id, card) {
    const res = await write('friend_cards', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify(rowOfCard(id, card)) }, [409])
    if (res.ok) return 'ok'
    // A unique violation: the account's own row or the code. Which one, the account's row says.
    return (await tableFriends.card(id)) ? 'exists' : 'taken'
  },
  async save(id, card) {
    await write(`friend_cards?sync_id=${eq(id)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify(rowOfCard(id, card)) })
  },
  ownerOf: async (code) => (await rows<{ sync_id: string }>(`friend_cards?code=${eq(code)}&select=sync_id`))[0]?.sync_id ?? null,
  async cardsOf(codes) {
    if (!codes.length) return []
    const found = await rows<CardRow>(`friend_cards?code=in.(${codes.join(',')})&select=${CARD_COLUMNS}`)
    const cards = codes.map((c) => found.find((r) => r.code === c)).filter((r): r is CardRow => !!r).map(cardOfRow)
    const nameless = cards.filter((c) => !c.name || c.name === 'Arkadaş')
    if (nameless.length > 0) {
      const syncIds = [...new Set(found.filter((r) => !r.name || r.name === 'Arkadaş').map((r) => r.sync_id))]
      if (syncIds.length > 0) {
        try {
          const keyRows = await rows<{ sync_id: string; username: string | null }>(`sync_keys?sync_id=in.(${syncIds.join(',')})&select=sync_id,username`)
          const nameMap = new Map<string, string>()
          for (const k of keyRows) {
            if (k.username?.trim()) nameMap.set(k.sync_id, k.username.trim())
          }
          for (const card of cards) {
            if (!card.name || card.name === 'Arkadaş') {
              const row = found.find((r) => r.code === card.code)
              if (row && nameMap.has(row.sync_id)) {
                card.name = nameMap.get(row.sync_id)!
                void tableFriends.save(row.sync_id, card).catch(() => undefined)
              }
            }
          }
        } catch {
          // ignore table resolution error
        }
      }
    }
    return cards
  },
  follows: async (id) => (await rows<{ code: string }>(`friend_follows?sync_id=${eq(id)}&select=code&order=created_at.asc`)).map((r) => r.code).filter((c) => CODE.test(c)),
  followers: async (code) => {
    const followerRows = await rows<{ sync_id: string }>(`friend_follows?code=${eq(code)}&select=sync_id`)
    if (!followerRows.length) return []
    const ids = [...new Set(followerRows.map((r) => r.sync_id))]
    const cards = await rows<{ code: string }>(`friend_cards?sync_id=in.(${ids.join(',')})&select=code`)
    return cards.map((c) => c.code).filter((c) => CODE.test(c))
  },
  follow: async (id, code) => void (await upsert('friend_follows', 'sync_id,code', { sync_id: id, code }, true)),
  unfollow: async (id, code) => void (await write(`friend_follows?sync_id=${eq(id)}&code=${eq(code)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })),
  async forget(id) {
    await Promise.all([
      write(`friend_cards?sync_id=${eq(id)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } }),
      write(`friend_follows?sync_id=${eq(id)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } }),
    ])
  },
}
