import { del, get, list, put } from '@vercel/blob'
import type { PushRecord } from './push.js'
import { eq, rows, tablesOn, upsert, write } from './_tables.js'
import { dueHours, dueNow } from './_due.js'

/**
 * Where reminder records are kept: Blob files (push/<key>.json) or, after the owner's move, the
 * Supabase table `reminders`. A key is the record's name: 40 hex of a browser's push address, or
 * 'mail-' and 40 hex of a mail address (the address itself never appears in a key).
 */
export interface ReminderStore {
  get(key: string): Promise<PushRecord | null>
  put(key: string, record: PushRecord): Promise<void>
  remove(key: string): Promise<void>
  /** Every record. */
  all(): Promise<{ key: string; record: PushRecord }[]>
  /** The records the hourly cron looks at in UTC hour `utcHour` (at least those due then). */
  due(utcHour: number): Promise<{ key: string; record: PushRecord }[]>
  /** The mail records an account registered (it is being deleted). */
  mailsOf(owner: string): Promise<string[]>
  /** The push records saved by an account's devices (a signed-in device records its account). */
  byOwner(owner: string): Promise<{ key: string; record: PushRecord }[]>
}

export const KEY = /^(mail-)?[0-9a-f]{40}$/
export const blobPath = (key: string) => `push/${key}.json`

export const reminderStore = async (): Promise<ReminderStore> => ((await tablesOn()) ? tableReminders : blobReminders)

/** Records read at a time from Blob. */
const BATCH = 10
/** Mail records looked at for an account's own (a flood must not make a deletion run for ever). */
const MAIL_SCAN_CAP = 3000

async function readBlob(path: string): Promise<PushRecord | null> {
  const blob = await get(path, { access: 'private', useCache: false }).catch(() => null)
  if (!blob || blob.statusCode !== 200 || !blob.stream) return null
  try {
    return JSON.parse(await new Response(blob.stream).text()) as PushRecord
  } catch {
    return null // A broken record is skipped.
  }
}

const keyOfPath = (path: string) => /^push\/((?:mail-)?[0-9a-f]{40})\.json$/.exec(path)?.[1] ?? null

/**
 * The hourly cron must not read every record every hour (Blob counts every read): `pushdue/HH.json` lists the keys
 * of the records due in UTC hour HH, so a run reads that one file and those records. A record is added when it is
 * saved; a key that went stale (record deleted, reminder hour changed) is dropped when a run finds it.
 */
const indexPath = (utcHour: number) => `pushdue/${String(utcHour).padStart(2, '0')}.json`
const INDEX_TRIES = 5

async function readIndex(utcHour: number): Promise<{ keys: string[] | null; etag: string | null }> {
  const blob = await get(indexPath(utcHour), { access: 'private', useCache: false }).catch(() => null)
  if (!blob || blob.statusCode !== 200 || !blob.stream) return { keys: null, etag: null }
  try {
    const keys = (JSON.parse(await new Response(blob.stream).text()) as { keys?: unknown }).keys
    return { keys: Array.isArray(keys) ? keys.filter((k): k is string => typeof k === 'string' && KEY.test(k)) : [], etag: blob.blob?.etag ?? null }
  } catch {
    return { keys: [], etag: blob.blob?.etag ?? null }
  }
}

/** Changes an hour's index as one read-modify-write (`If-Match`); false when the index does not exist yet. */
async function changeIndex(utcHour: number, change: (keys: string[]) => string[] | null): Promise<boolean> {
  for (let attempt = 0; attempt < INDEX_TRIES; attempt++) {
    const { keys, etag } = await readIndex(utcHour)
    if (!keys) return false
    const next = change(keys)
    if (!next) return true
    try {
      await put(indexPath(utcHour), JSON.stringify({ keys: next }), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', ...(etag ? { ifMatch: etag } : {}) })
      return true
    } catch (e) {
      if (!/precondition/i.test(`${(e as { name?: string })?.name ?? ''} ${(e as Error)?.message ?? ''}`)) throw e
    }
  }
  return false
}

/** Adds a saved record to the indexes of the hours it is due in. Before the index exists nothing is added: building it reads every record. */
async function indexKey(key: string, record: PushRecord) {
  for (const h of dueHours(record)) await changeIndex(h, (keys) => (keys.includes(key) ? null : [...keys, key])).catch(() => {})
}

/** Writes all 24 indexes from the records on hand (the first cron run after the index came). */
async function buildIndex() {
  const byHour: string[][] = Array.from({ length: 24 }, () => [])
  for (const { key, record } of await blobReminders.all()) for (const h of dueHours(record)) byHour[h].push(key)
  for (let h = 0; h < 24; h++) await put(indexPath(h), JSON.stringify({ keys: byHour[h] }), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
}

export const blobReminders: ReminderStore = {
  get: (key) => readBlob(blobPath(key)),
  async put(key, record) {
    await put(blobPath(key), JSON.stringify(record), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
    remembered = null
    await indexKey(key, record)
  },
  remove: async (key) => {
    remembered = null
    await del(blobPath(key)).catch(() => {})
  },
  async due(utcHour) {
    let index = await readIndex(utcHour)
    if (!index.keys) {
      // Never built (the first run after the index came): once, from every record.
      await buildIndex()
      index = await readIndex(utcHour)
    }
    const keys = index.keys ?? []
    const out: { key: string; record: PushRecord }[] = []
    const stale: string[] = []
    for (let i = 0; i < keys.length; i += BATCH) {
      const read = await Promise.all(keys.slice(i, i + BATCH).map(async (key) => ({ key, record: await readBlob(blobPath(key)) })))
      for (const { key, record } of read) {
        if (record && dueNow(record, utcHour)) out.push({ key, record })
        else stale.push(key) // Deleted, or its hour changed since.
      }
    }
    if (stale.length) await changeIndex(utcHour, (ks) => ks.filter((k) => !stale.includes(k))).catch(() => {})
    return out
  },
  async all() {
    const out: { key: string; record: PushRecord }[] = []
    let cursor: string | undefined
    do {
      const page = await list({ prefix: 'push/', cursor })
      // Read in small parallel batches: a record at a time takes too long with a few hundred devices.
      for (let i = 0; i < page.blobs.length; i += BATCH) {
        const read = await Promise.all(
          page.blobs.slice(i, i + BATCH).map(async (b) => {
            const key = keyOfPath(b.pathname)
            const record = key ? await readBlob(b.pathname) : null
            return key && record ? { key, record } : null
          }),
        )
        for (const r of read) if (r) out.push(r)
      }
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
    return out
  },
  async mailsOf(owner) {
    const keys: string[] = []
    let seen = 0
    let cursor: string | undefined
    do {
      const page = await list({ prefix: 'push/mail-', cursor })
      for (const b of page.blobs) {
        seen++
        const key = keyOfPath(b.pathname)
        if (key && (await readBlob(b.pathname))?.owner === owner) keys.push(key)
      }
      cursor = page.hasMore && seen < MAIL_SCAN_CAP ? page.cursor : undefined
    } while (cursor)
    return keys
  },
  // Blob has no index by owner: the records are read and the account's picked out (a friend's message is rare and rate limited).
  byOwner: async (owner) => (await allRemembered()).filter(({ key, record }) => !key.startsWith('mail-') && record.owner === owner),
}

/** Every record, remembered a few minutes by this instance: each friend's message looks for its recipient's devices, and a full read costs one Blob read per record. */
let remembered: { at: number; records: { key: string; record: PushRecord }[] } | null = null
async function allRemembered() {
  if (!remembered || Date.now() - remembered.at > 5 * 60_000) remembered = { at: Date.now(), records: await blobReminders.all() }
  return remembered.records
}

interface ReminderRow {
  key: string
  record: PushRecord
}

/** A row of `reminders`: the record whole, and a few of its fields as columns for the dashboard. */
export const rowOfReminder = (key: string, r: PushRecord) => ({
  key,
  kind: key.startsWith('mail-') ? 'mail' : 'push',
  owner: r.owner ?? (key.startsWith('mail-') ? null : r.group),
  email: r.email ?? null,
  confirmed: !!r.confirmed,
  record: r,
  updated_at: new Date().toISOString(),
})

export const tableReminders: ReminderStore = {
  get: async (key) => (await rows<ReminderRow>(`reminders?key=${eq(key)}&select=key,record`))[0]?.record ?? null,
  put: async (key, record) => void (await upsert('reminders', 'key', rowOfReminder(key, record))),
  remove: async (key) => void (await write(`reminders?key=${eq(key)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })),
  async all() {
    const out: ReminderRow[] = []
    // Paged: PostgREST answers at most its max-rows (1000 by default) at a time.
    for (let from = 0; ; from += 1000) {
      const page = await rows<ReminderRow>(`reminders?select=key,record&order=key.asc&limit=1000&offset=${from}`)
      out.push(...page)
      if (page.length < 1000) break
    }
    return out.filter((r) => r.record && KEY.test(r.key)).map((r) => ({ key: r.key, record: r.record }))
  },
  due: () => tableReminders.all(),
  mailsOf: async (owner) => (await rows<{ key: string }>(`reminders?kind=eq.mail&owner=${eq(owner)}&select=key`)).map((r) => r.key),
  async byOwner(owner) {
    const found = await rows<ReminderRow>(`reminders?kind=eq.push&owner=${eq(owner)}&select=key,record`)
    return found.filter((r) => r.record && KEY.test(r.key) && r.record.owner === owner).map((r) => ({ key: r.key, record: r.record }))
  },
}
