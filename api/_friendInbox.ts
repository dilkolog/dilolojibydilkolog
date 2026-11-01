import { del, get, put } from '@vercel/blob'
import { StorageError } from './_account.js'
import { eq, inboxTableOn, rows, upsert, write } from './_tables.js'
import { friendStore } from './_friendStore.js'
import { CODE, type FriendCard, ownCard, plain } from './_friends.js'

// ---------------------------------------------------------------------------
// The friends' inbox: a cheer, a nudge, (later) a gift word or a text, from one friend to another.
// Kept in Blob files in both modes (a few hundred bytes per person, so no table needed).
// ---------------------------------------------------------------------------

export const inboxPath = (id: string) => `friends/inbox/${id}.json`

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

/** A web address in what was sent. A word, its meaning and a title have none; a text may quote a link or two, not advertise. */
const LINK = /(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|ru|xyz|ly|me|io|co|tk|top|cc)\b\/)/gi
const MAX_TEXT_LINKS = 2
const hasLink = (s: string) => new RegExp(LINK.source, 'i').test(s)

/** The gift as sent, checked and trimmed; null when it is not a word with a meaning. */
export function cleanGift(raw: unknown): GiftWord | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as Record<string, unknown>
  const language = typeof g.language === 'string' && LANGUAGES.includes(g.language) ? g.language : ''
  const lemma = plain(g.lemma, 60)
  const meaning = plain(g.meaning, 120)
  if (!language || !lemma || !meaning) return null
  const example = plain(g.example, 200)
  if ([lemma, meaning, example, plain(g.exampleTranslation, 200)].some(hasLink)) return null
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
  // No advertising by text: a title with a link, or a body with more than a couple, is not delivered.
  if (hasLink(title) || (body.match(LINK) ?? []).length > MAX_TEXT_LINKS) return null
  return { language, title, body }
}



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

export const readInbox = async (id: string): Promise<InboxItem[]> => ((await inboxTableOn()) ? readInboxTable(id) : (await readInboxBlob(id)).items)
const changeInbox = async (id: string, change: (items: InboxItem[]) => InboxItem[] | null): Promise<void> => ((await inboxTableOn()) ? changeInboxTable(id, change) : changeInboxBlob(id, change))

/** What waits for the account, newest first. */
export async function inboxOf(id: string): Promise<InboxItem[]> {
  return (await readInbox(id)).sort((a, b) => b.at.localeCompare(a.at))
}

export type SendResult = 'ok' | 'unknown' | 'self' | 'not_friends' | 'bad_kind' | 'bad_payload' | 'studied'

/** One change to an inbox at a time (in this server instance): two sends, or a send and a clearing, would otherwise each read the same list and the second write would undo the first. */
const inboxLocks = new Map<string, Promise<unknown>>()
export function withInbox<T>(id: string, change: () => Promise<T>): Promise<T> {
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
export async function deliver(recipient: string, me: FriendCard, kind: InboxKind, gift: GiftWord | null, text: SentText | null, now: Date, today: string, onItem: (item: InboxItem) => void): Promise<SendResult> {
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
