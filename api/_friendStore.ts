import { readText, removeBlob, writeJson } from './_account.js'
import { eq, rows, tablesOn, upsert, write } from './_tables.js'
import { CODE, type FriendCard, resolveAccountName } from './_friends.js'

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

export async function readJson<T>(path: string): Promise<T | null> {
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
    const card = await readJson<FriendCard>(cardPath(id))
    // Keep the card until its secondary code index has been removed, so failures can be retried.
    if (card?.code) await removeBlob(codePath(card.code), true)
    await Promise.all([removeBlob(cardPath(id), true), removeBlob(followPath(id), true)])
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
