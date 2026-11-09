import { list } from './_blob'
import { readText } from './_account.js'
import { CODE, rowOfCard, type FriendCard } from './_friends.js'
import { KEY, rowOfReminder } from './_reminders.js'
import type { PushRecord } from './push.js'
import { rowOfShare, SHARE_ID, type LibraryItem, type SharedDoc } from './share.js'
import { finishMoving, FLAG_MS, startMoving, tablesState, write } from './_tables.js'

/**
 * The owner's move of friends, shared lists and reminders from the R2 files to the Supabase tables (admin.ts
 * 'move-tables', after supabase/migrations/0003_server_tables.sql), a step at a time: the free Worker plan allows
 * 50 subrequests a request, and one request could never copy every file.
 *
 * 1. The first step writes the 'tables-moving' flag: writes go to the tables from then on, reads look in the tables
 *    first and then in the files (_tables.ts). It copies nothing yet: the other server instances keep their answer
 *    about the flag for up to FLAG_MS, and one of them could still write a file the copy has already read.
 * 2. Once SETTLE_MS have passed, each step copies one page (at most MOVE_STEP files) of one kind. A row the table
 *    already has is kept: it was written since the move started, so it is the newer.
 * 3. After the last page, the 'tables' flag: the files are no longer read. They stay where they are.
 *
 * The caller repeats with `next` until it is null; a step cut short is simply run again (nothing doubles).
 */
export const MOVE_STEP = 15
/** Longer than any instance keeps the old answer about the flags. */
export const SETTLE_MS = 2 * FLAG_MS
/** The kinds in the order they are copied. */
const PREFIXES = ['friends/card/', 'friends/follow/', 'share/', 'push/'] as const

export interface TablesStep {
  copied: number
  /** Where the next call goes on; null when the move has finished. */
  next: { prefix: number; cursor?: string } | null
  /** The kind this step copied ('' when it copied nothing). */
  at: string
  /** Milliseconds to wait before the next step (only right after the move started). */
  wait?: number
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse((await readText(path)) ?? 'null') as T | null
  } catch {
    return null
  }
}

/** Inserts rows unless a row with their key is there (a clash on another unique column, a code, is skipped). */
const insertNew = async (name: string, conflict: string, row: unknown) =>
  (await write(`${name}?on_conflict=${conflict}`, { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(row) }, [409])).ok

/** Copies one file; true when it was a record of this kind (copied now, or already in the table). */
async function copyOne(prefix: (typeof PREFIXES)[number], path: string, library: () => Promise<LibraryItem[]>): Promise<boolean> {
  if (prefix === 'friends/card/') {
    const id = /^friends\/card\/([0-9a-f]{64})\.json$/.exec(path)?.[1]
    const card = id ? await readJson<FriendCard>(path) : null
    if (!id || !card || !CODE.test(card.code)) return false
    return insertNew('friend_cards', 'sync_id', rowOfCard(id, { ...card, days: card.days ?? {}, at: card.at ?? new Date().toISOString() }))
  }
  if (prefix === 'friends/follow/') {
    const id = /^friends\/follow\/([0-9a-f]{64})\.json$/.exec(path)?.[1]
    const codes = id ? ((await readJson<{ codes?: string[] }>(path))?.codes ?? []).filter((c) => CODE.test(c)) : []
    if (!id || !codes.length) return false
    // One request for the account's follows, not one a follow.
    return insertNew('friend_follows', 'sync_id,code', [...new Set(codes)].map((code) => ({ sync_id: id, code })))
  }
  if (prefix === 'share/') {
    const id = /^share\/([0-9a-f]{32})\.json$/.exec(path)?.[1]
    const doc = id && SHARE_ID.test(id) ? await readJson<SharedDoc>(path) : null
    if (!id || !doc?.words) return false
    const published = (await library()).find((x) => x.id === id)
    return insertNew('shared_lists', 'id', rowOfShare(id, doc, published ? { by: published.by } : undefined))
  }
  const key = /^push\/((?:mail-)?[0-9a-f]{40})\.json$/.exec(path)?.[1]
  const record = key && KEY.test(key) ? await readJson<PushRecord>(path) : null
  if (!key || !record) return false
  return insertNew('reminders', 'key', rowOfReminder(key, record))
}

export async function moveTablesStep(from: { prefix: number; cursor?: string } = { prefix: 0 }, now = Date.now()): Promise<TablesStep> {
  const { state, since } = await tablesState()
  if (state === 'on') return { copied: 0, next: null, at: '' }
  if (state !== 'moving') {
    await startMoving(now)
    return { copied: 0, next: { prefix: 0 }, at: '', wait: SETTLE_MS }
  }
  const waited = now - (since ?? 0)
  if (waited < SETTLE_MS) return { copied: 0, next: from, at: '', wait: SETTLE_MS - waited }
  const prefix = PREFIXES[from.prefix]
  if (!prefix) {
    await finishMoving()
    return { copied: 0, next: null, at: '' }
  }
  const page = await list({ prefix, cursor: from.cursor, limit: MOVE_STEP })
  // The public library (which lists are published, and by whom) is read once a step, and only for lists.
  let lib: Promise<LibraryItem[]> | null = null
  const library = () => (lib ??= readJson<LibraryItem[]>('share/library.json').then((l) => (Array.isArray(l) ? l : [])))
  const done = await Promise.all(page.blobs.map((b) => copyOne(prefix, b.pathname, library)))
  const next = page.hasMore && page.cursor ? { prefix: from.prefix, cursor: page.cursor } : { prefix: from.prefix + 1 }
  return { copied: done.filter(Boolean).length, next, at: prefix }
}
