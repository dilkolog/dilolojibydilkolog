import { accessFetch } from './access'

/**
 * Friends, the device's side (the server's in api/_friends.ts, reached through /api/access): the own
 * card (a name, the avatar, the XP of the last two weeks, streak and level) published under a friend
 * code, and the cards of the friends whose codes were added.
 */
export interface FriendView {
  code: string
  name: string
  avatar: string
  color: string
  today: number
  week: number
  streak: number
  level: number
  /** XP by local date, the last two weeks (a friend's page, the weekly league). */
  days: Record<string, number>
  at: string
}

export interface FriendCardInput {
  name: string
  avatar: string
  color: string
  /** XP by local date (the server keeps the last two weeks). */
  days: Record<string, number>
  streak: number
  level: number
}

/** What the server said no to: an unknown code, one's own, too many friends, or no (approved) account. */
export class FriendsError extends Error {
  readonly reason: string
  constructor(reason: string) {
    super(reason)
    this.reason = reason
  }
}

const post = async (body: Record<string, unknown>) => {
  const res = await accessFetch('/api/access', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const data = (await res.json().catch(() => ({}))) as { error?: string; me?: FriendView }
  if (!res.ok) throw new FriendsError(data.error ?? `http ${res.status}`)
  return data
}

export async function loadFriends(today: string): Promise<{ me: FriendView; friends: FriendView[] }> {
  const res = await accessFetch(`/api/access?friends=1&today=${today}`)
  const data = (await res.json().catch(() => ({}))) as { error?: string; me?: FriendView; friends?: FriendView[] }
  if (!res.ok || !data.me) throw new FriendsError(data.error ?? `http ${res.status}`)
  return { me: data.me, friends: data.friends ?? [] }
}

/** What a friend can send: a cheer or a nudge. */
export type InboxKind = 'cheer' | 'nudge'
export interface InboxItem {
  id: string
  kind: InboxKind
  from: { code: string; name: string }
  at: string
}

export async function loadInbox(): Promise<InboxItem[]> {
  const res = await accessFetch('/api/access?inbox=1')
  const data = (await res.json().catch(() => ({}))) as { items?: InboxItem[]; error?: string }
  if (!res.ok) throw new FriendsError(data.error ?? `http ${res.status}`)
  return data.items ?? []
}

export const sendToFriend = async (code: string, kind: InboxKind) => void (await post({ action: 'friends-send', code, kind }))
export const clearInbox = async (ids: string[]) => void (await post({ action: 'friends-inbox-clear', ids }))

export const publishFriendCard = async (card: FriendCardInput, today: string): Promise<FriendView | undefined> => (await post({ action: 'friends-publish', ...card, today })).me
export const addFriend = async (code: string) => void (await post({ action: 'friends-add', code }))
export const removeFriend = async (code: string) => void (await post({ action: 'friends-remove', code }))

/** A code as it is shown and read aloud: ABCD-EFGH. */
export const showCode = (code: string) => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code)

/** The last two weeks of XP, for the card. */
export function recentDays(byDay: ReadonlyMap<string, number>, today: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [day, xp] of byDay) if (day <= today && day >= shift(today, -13) && xp > 0) out[day] = xp
  return out
}

const shift = (day: string, by: number) => new Date(new Date(`${day}T12:00:00Z`).getTime() + by * 86_400_000).toISOString().slice(0, 10)
