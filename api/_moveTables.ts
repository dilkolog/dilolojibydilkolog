import { list } from '@vercel/blob'
import { readText } from './_account.js'
import { CODE, rowOfCard, type FriendCard } from './_friends.js'
import { blobReminders, rowOfReminder } from './_reminders.js'
import { blobSharesForMove, rowOfShare } from './share.js'
import { setTablesFlag, write } from './_tables.js'

/**
 * The owner's one-time move of friends, shared lists and reminders from Blob files to the Supabase tables
 * (admin.ts 'move-tables', after supabase/migrations/0003_server_tables.sql). The flag goes first, so every
 * new write lands in the tables (other server instances follow within seconds); then each Blob record is
 * copied unless the table already has it, so a row written since the flag is never overwritten by an
 * older file. Running it again copies what a broken run left out. The Blob files stay (nothing reads them).
 */
const AT_ONCE = 10

async function inBatches<T>(items: T[], run: (item: T) => Promise<boolean>): Promise<number> {
  let done = 0
  for (let i = 0; i < items.length; i += AT_ONCE) done += (await Promise.all(items.slice(i, i + AT_ONCE).map(run))).filter(Boolean).length
  return done
}

async function blobFiles(prefix: string): Promise<string[]> {
  const out: string[] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix, cursor })
    out.push(...page.blobs.map((b) => b.pathname))
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return out
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse((await readText(path)) ?? 'null') as T | null
  } catch {
    return null
  }
}

/** Inserts a row unless one with its key is there; a clash on another unique column (a code) is skipped. */
const insertNew = async (name: string, conflict: string, row: unknown) =>
  (await write(`${name}?on_conflict=${conflict}`, { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(row) }, [409])).ok

/** What is in the tables after the move (copied now or there before; the REST answer does not tell which). */
export interface MoveResult {
  cards: number
  follows: number
  shares: number
  reminders: number
}

export async function moveToTables(): Promise<MoveResult> {
  await setTablesFlag()

  const cardFiles = (await blobFiles('friends/card/')).map((p) => ({ p, id: /([0-9a-f]{64})\.json$/.exec(p)?.[1] })).filter((f): f is { p: string; id: string } => !!f.id)
  const cards = await inBatches(cardFiles, async ({ p, id }) => {
    const card = await readJson<FriendCard>(p)
    return !!card && CODE.test(card.code) && insertNew('friend_cards', 'sync_id', rowOfCard(id, { ...card, days: card.days ?? {}, at: card.at ?? new Date().toISOString() }))
  })

  const followFiles = (await blobFiles('friends/follow/')).map((p) => ({ p, id: /([0-9a-f]{64})\.json$/.exec(p)?.[1] })).filter((f): f is { p: string; id: string } => !!f.id)
  const pairs = (await Promise.all(followFiles.map(async ({ p, id }) => ((await readJson<{ codes?: string[] }>(p))?.codes ?? []).filter((c) => CODE.test(c)).map((code) => ({ id, code }))))).flat()
  const follows = await inBatches(pairs, ({ id, code }) => insertNew('friend_follows', 'sync_id,code', { sync_id: id, code }))

  const shares = await inBatches(await blobSharesForMove(), ({ id, doc, published }) => insertNew('shared_lists', 'id', rowOfShare(id, doc, published ? { by: published.by } : undefined)))

  const reminders = await inBatches(await blobReminders.all(), ({ key, record }) => insertNew('reminders', 'key', rowOfReminder(key, record)))

  return { cards, follows, shares, reminders }
}
