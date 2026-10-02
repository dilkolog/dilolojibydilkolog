import { db } from '../data/instance'
import { syncNow, type SyncResult } from '../data/sync'

/** One sync at a time; listeners hear when data may have changed. */
let running: Promise<SyncResult | null> | null = null
const listeners = new Set<() => void>()

export const onSynced = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export async function getSyncCode(): Promise<string | null> {
  return ((await db.meta.get('syncCode'))?.value as string | undefined) ?? null
}

export async function setSyncCode(code: string | null) {
  if (code) await db.meta.put({ key: 'syncCode', value: code })
  else await db.meta.bulkDelete(['syncCode', 'syncAt'])
}

/** Syncs if a code is set; failures (offline etc.) are silent unless `throwErrors`. */
export function runSync(throwErrors = false): Promise<SyncResult | null> {
  if (running) return running
  running = (async () => {
    try {
      const code = await getSyncCode()
      if (!code) return null
      const result = await syncNow(db, code)
      for (const fn of listeners) fn()
      return result
    } catch (e) {
      if (throwErrors) throw e
      return null
    } finally {
      running = null
    }
  })()
  return running
}
