import { readText, removeBlob, StorageError, writeJson } from './_account.js'

/**
 * Friends: an account shares a small card of how it is doing (a name it chose, its avatar, the XP of its
 * last two weeks, its streak and level) under a friend code, and follows the friends whose codes it was
 * given. Following is one-way, like giving someone your number: they see you once they add your code.
 * The card carries nothing else: no words, no answers, no account id (the code stands in for it).
 *
 * Kept in the Blob store:
 *   friends/card/<account id>.json   the account's own card, with its code
 *   friends/code/<CODE>.json         → { id } (the code's owner)
 *   friends/follow/<account id>.json → { codes } (whom it follows)
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
  /** When the card was last updated (ISO). */
  at: string
}

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

/** The account's card, made (with a fresh code) the first time. */
export async function ownCard(id: string): Promise<FriendCard> {
  const card = await readJson<FriendCard>(cardPath(id))
  if (card?.code) return card
  for (let i = 0; i < 5; i++) {
    const code = newCode()
    if (await readText(codePath(code))) continue
    await writeJson(codePath(code), { id })
    const fresh: FriendCard = { code, name: 'Arkadaş', avatar: '', color: '#6366f1', days: {}, streak: 0, level: 1, at: new Date().toISOString() }
    await writeJson(cardPath(id), fresh)
    return fresh
  }
  throw new StorageError('no free code')
}

export async function publishCard(id: string, body: Record<string, unknown>, today: string): Promise<FriendCard> {
  const card = await ownCard(id)
  const next: FriendCard = { ...card, ...cleanCard(body, today), code: card.code, at: new Date().toISOString() }
  await writeJson(cardPath(id), next)
  return next
}

const following = async (id: string) => (await readJson<{ codes?: string[] }>(followPath(id)))?.codes?.filter((c) => CODE.test(c)) ?? []

/** Follows the code's owner. Errors: unknown code, one's own code, too many friends. */
export async function addFriend(id: string, code: string): Promise<'ok' | 'unknown' | 'self' | 'full'> {
  if (!CODE.test(code)) return 'unknown'
  const owner = await readJson<{ id?: string }>(codePath(code))
  if (!owner?.id) return 'unknown'
  if (owner.id === id) return 'self'
  const codes = await following(id)
  if (codes.includes(code)) return 'ok'
  if (codes.length >= MAX_FRIENDS) return 'full'
  await writeJson(followPath(id), { codes: [...codes, code] })
  return 'ok'
}

export async function removeFriend(id: string, code: string): Promise<void> {
  const codes = await following(id)
  if (codes.includes(code)) await writeJson(followPath(id), { codes: codes.filter((c) => c !== code) })
}

/** A card as a friend sees it, "today" and "this week" by the reader's own date. */
export function viewOf(card: FriendCard, today: string): FriendView {
  const weekStart = new Date(new Date(`${today}T12:00:00Z`).getTime() - 6 * 86_400_000).toISOString().slice(0, 10)
  const week = Object.entries(card.days).reduce((n, [d, xp]) => (d >= weekStart && d <= today ? n + xp : n), 0)
  return { code: card.code, name: card.name, avatar: card.avatar, color: card.color, today: card.days[today] ?? 0, week, streak: card.streak, level: card.level, at: card.at }
}

/** The account's own card and those of whom it follows (a code whose card is gone is left out). */
export async function friendsOf(id: string, today: string): Promise<{ me: FriendView; friends: FriendView[] }> {
  const [me, codes] = await Promise.all([ownCard(id), following(id)])
  const cards = await Promise.all(
    codes.map(async (code) => {
      const owner = await readJson<{ id?: string }>(codePath(code))
      return owner?.id ? readJson<FriendCard>(cardPath(owner.id)) : null
    }),
  )
  return { me: viewOf(me, today), friends: cards.filter((c): c is FriendCard => !!c?.code).map((c) => viewOf(c, today)) }
}

/** Takes the account's card, its code and whom it follows off the store (the account is being deleted). */
export async function forgetFriends(id: string): Promise<void> {
  const card = await readJson<FriendCard>(cardPath(id))
  await Promise.all([removeBlob(cardPath(id)), removeBlob(followPath(id)), card?.code ? removeBlob(codePath(card.code)) : Promise.resolve()])
}
