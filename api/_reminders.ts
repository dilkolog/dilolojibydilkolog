import { del, get, list, put } from '@vercel/blob'
import type { PushRecord } from './push.js'
import { eq, rows, tablesOn, upsert, write } from './_tables.js'

/**
 * Where reminder records are kept: Blob files (push/<key>.json) or, after the owner's move, the
 * Supabase table `reminders`. A key is the record's name: 40 hex of a browser's push address, or
 * 'mail-' and 40 hex of a mail address (the address itself never appears in a key).
 */
export interface ReminderStore {
  get(key: string): Promise<PushRecord | null>
  put(key: string, record: PushRecord): Promise<void>
  remove(key: string): Promise<void>
  /** Every record, for the hourly cron. */
  all(): Promise<{ key: string; record: PushRecord }[]>
  /** The mail records an account registered (it is being deleted). */
  mailsOf(owner: string): Promise<string[]>
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

export const blobReminders: ReminderStore = {
  get: (key) => readBlob(blobPath(key)),
  async put(key, record) {
    await put(blobPath(key), JSON.stringify(record), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
  },
  remove: async (key) => void (await del(blobPath(key)).catch(() => {})),
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
  mailsOf: async (owner) => (await rows<{ key: string }>(`reminders?kind=eq.mail&owner=${eq(owner)}&select=key`)).map((r) => r.key),
}
