import { readText, removeBlob, StorageError, writeJson } from './_account.js'
import { eq, rows, tablesOn, upsert, write } from './_tables.js'

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
  await Promise.all([blobFriends.forget(id), removeBlob(inboxPath(id)), (await tablesOn()) ? tableFriends.forget(id) : Promise.resolve()])
}

// ---------------------------------------------------------------------------
// The friends' inbox: a cheer, a nudge, (later) a gift word or a text, from one friend to another.
// Kept in Blob files in both modes (a few hundred bytes per person, so no table needed).
// ---------------------------------------------------------------------------

export type InboxKind = 'cheer' | 'nudge'
export const INBOX_KINDS: readonly InboxKind[] = ['cheer', 'nudge']
const MAX_INBOX = 30
const KEEP_DAYS = 30

export interface InboxItem {
  id: string
  kind: InboxKind
  from: { code: string; name: string }
  at: string
}

const inboxPath = (id: string) => `friends/inbox/${id}.json`

async function readInbox(id: string): Promise<InboxItem[]> {
  const items = (await readJson<{ items?: InboxItem[] }>(inboxPath(id)))?.items
  if (!Array.isArray(items)) return []
  const oldest = Date.now() - KEEP_DAYS * 86_400_000
  return items.filter((i) => i && typeof i.id === 'string' && INBOX_KINDS.includes(i.kind) && new Date(i.at).getTime() > oldest)
}

/** What waits for the account, newest first. */
export async function inboxOf(id: string): Promise<InboxItem[]> {
  return (await readInbox(id)).sort((a, b) => b.at.localeCompare(a.at))
}

export type SendResult = 'ok' | 'unknown' | 'self' | 'not_friends' | 'bad_kind'

/**
 * A cheer or a nudge for a friend. Only between friends (one of them follows the other), and one of a kind
 * per sender a day: a second replaces the first rather than piling up.
 */
export async function sendToFriend(id: string, toCode: string, kind: unknown): Promise<SendResult> {
  if (typeof kind !== 'string' || !INBOX_KINDS.includes(kind as InboxKind)) return 'bad_kind'
  if (!CODE.test(toCode)) return 'unknown'
  const store = await friendStore()
  const [recipient, me] = await Promise.all([store.ownerOf(toCode), ownCard(id)])
  if (!recipient) return 'unknown'
  if (recipient === id) return 'self'
  const [mine, theirs] = await Promise.all([store.follows(id), store.follows(recipient)])
  if (!mine.includes(toCode) && !theirs.includes(me.code)) return 'not_friends'
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const fresh = (await readInbox(recipient)).filter((i) => !(i.from.code === me.code && i.kind === kind && i.at.slice(0, 10) === today))
  const item: InboxItem = { id: crypto.randomUUID(), kind: kind as InboxKind, from: { code: me.code, name: me.name }, at: now.toISOString() }
  await writeJson(inboxPath(recipient), { items: [item, ...fresh].slice(0, MAX_INBOX) })
  return 'ok'
}

/** Takes the listed messages out of the account's inbox (read, or turned away). */
export async function clearInbox(id: string, ids: unknown): Promise<void> {
  if (!Array.isArray(ids)) return
  const drop = new Set(ids.filter((x): x is string => typeof x === 'string'))
  const items = await readInbox(id)
  const left = items.filter((i) => !drop.has(i.id))
  if (left.length !== items.length) await writeJson(inboxPath(id), { items: left })
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
