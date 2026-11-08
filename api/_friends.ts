import { removeBlob, StorageError, writeJson } from './_account.js'
import { eq, inboxTableOn, rows, tablesOn, write } from './_tables.js'
import { handleOf, handleOfPath, releaseHandle, requestsPath } from './_friendHandles.js'
import { type InboxItem, clearInbox, inboxOf, inboxPath } from './_friendInbox.js'
import { blobFriends, friendStore, readJson, tableFriends } from './_friendStore.js'

/**
 * Friends: an account shares a small card of how it is doing (a name it chose, its avatar, the XP of its
 * last two weeks, its streak and level) under a friend code, and follows the friends whose codes it was
 * given. Following is one-way, like giving someone your number: they see you once they add your code.
 * The card carries nothing else: no words, no answers, no account id (the code stands in for it).
 *
 * Kept in Blob files or, once the owner moved them, Supabase tables (see FriendStore below).
 *
 * The app reaches this through /api/access (a leftover of Vercel's twelve-function limit).
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
export const plain = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\p{Cc}<>]/gu, '').trim().slice(0, max) : '')

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

/** What an invite shows of the one who sent it, before anything is added: their card's face, never an id. */
export interface InviterCard {
  name: string
  avatar: string
  color: string
  level: number
}

/**
 * The card behind an invite code, so the invited person sees who it really is (the name in the link is only what the
 * link says) before becoming friends. Null for a code no one holds, 'self' for one's own.
 */
export async function inviterCard(id: string, code: string): Promise<InviterCard | 'self' | null> {
  if (!CODE.test(code)) return null
  const store = await friendStore()
  const owner = await store.ownerOf(code)
  if (!owner) return null
  if (owner === id) return 'self'
  const card = await store.card(owner)
  return card?.code ? { name: card.name, avatar: card.avatar, color: card.color, level: card.level } : null
}

/** Follows the code's owner. Errors: unknown code, one's own code, too many friends. */
export async function addFriend(id: string, code: string): Promise<'ok' | 'unknown' | 'self' | 'full'> {
  if (!CODE.test(code)) return 'unknown'
  const store = await friendStore()
  const owner = await store.ownerOf(code)
  if (!owner) return 'unknown'
  if (owner === id) return 'self'
  const [codes, myCard] = await Promise.all([store.follows(id), ownCard(id)])
  // Someone who took this person off their friends cannot put themselves back with the code they still know.
  if (myCard?.code && (await blockedBy(owner)).includes(myCard.code)) return 'unknown'
  // Adding someone back by choice lifts one's own block on them.
  await unblock(id, code)
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
  // Taken off: they may not add this person back with the code (or send a request) until this person adds them again.
  if (CODE.test(code)) await block(id, code)
}

/**
 * Whom an account took off its friends: their codes, so that they cannot follow it again with the code they saw while
 * friends (adding by code is mutual) or keep sending requests. A small file in Blob in both modes, like the inbox.
 */
const blockedPath = (id: string) => `friends/blocked/${id}.json`
const MAX_BLOCKED = 200

export async function blockedBy(id: string): Promise<string[]> {
  const codes = (await readJson<{ codes?: unknown }>(blockedPath(id)))?.codes
  return Array.isArray(codes) ? codes.filter((c): c is string => typeof c === 'string' && CODE.test(c)) : []
}

async function block(id: string, code: string): Promise<void> {
  const codes = await blockedBy(id)
  if (!codes.includes(code)) await writeJson(blockedPath(id), { codes: [code, ...codes].slice(0, MAX_BLOCKED) })
}

async function unblock(id: string, code: string): Promise<void> {
  const codes = await blockedBy(id)
  if (codes.includes(code)) await writeJson(blockedPath(id), { codes: codes.filter((c) => c !== code) })
}

/** Someone the account blocked, as its block list shows them (the card may be gone: then only the code). */
export interface BlockedPerson {
  code: string
  name: string
  avatar: string
  color: string
}

/** The block list, newest first: whom the account took off its friends or blocked from a message. */
export async function blockedPeople(id: string): Promise<BlockedPerson[]> {
  const codes = await blockedBy(id)
  if (!codes.length) return []
  const cards = await (await friendStore()).cardsOf(codes)
  return codes.map((code) => {
    const card = cards.find((c) => c?.code === code)
    return { code, name: card?.name ?? '', avatar: card?.avatar ?? '', color: card?.color ?? '' }
  })
}

/**
 * Blocks someone: off the friends both ways (removeFriend keeps them from coming back by code, invite link or
 * request), and what they sent that is still waiting leaves the inbox.
 */
export async function blockFriend(id: string, code: string): Promise<void> {
  if (!CODE.test(code)) return
  await removeFriend(id, code)
  const theirs = (await inboxOf(id)).filter((m) => m.from.code === code).map((m) => m.id)
  if (theirs.length) await clearInbox(id, theirs)
}

/** Lifts a block: they may find and ask the account again (nothing comes back by itself). */
export const unblockFriend = (id: string, code: string) => (CODE.test(code) ? unblock(id, code) : Promise.resolve())

/** What the account's inbox holds under this id, for a report on it (the server's copy, not the reporter's word). */
export const inboxItemOf = async (id: string, itemId: string): Promise<InboxItem | null> => (await inboxOf(id)).find((m) => m.id === itemId) ?? null

/** Whose card a code is, for a report: the account and the card's name. */
export async function cardOwner(code: string): Promise<{ owner: string; name: string } | null> {
  if (!CODE.test(code)) return null
  const store = await friendStore()
  const [owner, cards] = await Promise.all([store.ownerOf(code), store.cardsOf([code])])
  return owner ? { owner, name: cards[0]?.name ?? '' } : null
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
  const handle = await handleOf(id)
  if (handle) await releaseHandle(handle.handle, id, true)
  await Promise.all([removeBlob(handleOfPath(id), true), removeBlob(requestsPath(id), true), removeBlob(blockedPath(id), true)])
  // Not swallowed: a deletion that left the messages behind must fail (and can be tried again).
  if (await inboxTableOn()) await write(`friend_inbox?sync_id=${eq(id)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  await Promise.all([blobFriends.forget(id), removeBlob(inboxPath(id), true), (await tablesOn()) ? tableFriends.forget(id) : Promise.resolve()])
}

export * from './_friendInbox.js'
export * from './_friendHandles.js'
export * from './_friendStore.js'
