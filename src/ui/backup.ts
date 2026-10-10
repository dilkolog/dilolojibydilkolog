import { exportBackup, type KelimeDB } from '../data/db'

/** Per device on purpose (localStorage, not the synced meta table): a backup is of this device. */
const LAST_KEY = 'kelime-koc:last-backup'
const DISMISS_KEY = 'kelime-koc:backup-nudge-dismissed'
/** Enough words that losing them would hurt. */
export const BACKUP_MIN_WORDS = 20
const BACKUP_EVERY_DAYS = 30
const DAY = 86_400_000

const read = (key: string): number | null => {
  try {
    const v = Number(localStorage.getItem(key))
    return v > 0 ? v : null
  } catch {
    return null
  }
}
const write = (key: string, at: number) => {
  try {
    localStorage.setItem(key, String(at))
  } catch {
    // Private mode: the nudge may come back; nothing is lost.
  }
}

export const dismissBackupNudge = (now = Date.now()) => write(DISMISS_KEY, now)

/**
 * Whether to suggest a backup: the data lives only on this device (no sync), there is enough
 * of it, and the last backup (or the last "not now") is a month old or more. Returns the days
 * since the last backup (null: never), or false for no nudge.
 */
export function backupDue(o: { synced: boolean; words: number; lastBackup: number | null; dismissed: number | null; now: number }): number | null | false {
  if (o.synced || o.words < BACKUP_MIN_WORDS) return false
  const stale = (at: number | null) => at === null || o.now - at >= BACKUP_EVERY_DAYS * DAY
  if (!stale(o.lastBackup) || !stale(o.dismissed)) return false
  return o.lastBackup === null ? null : Math.floor((o.now - o.lastBackup) / DAY)
}

export const backupState = (synced: boolean, words: number, now = Date.now()) =>
  backupDue({ synced, words, lastBackup: read(LAST_KEY), dismissed: read(DISMISS_KEY), now })

/** Downloads the whole backup as a JSON file and remembers when. */
export async function downloadBackup(db: KelimeDB, now = new Date()) {
  const json = await exportBackup(db)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `kelime-kocu-yedek-${now.toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  write(LAST_KEY, now.getTime())
}

/**
 * Asks the browser to keep this site's data under storage pressure (and Safari's 7-day rule for
 * sites not on the home screen). Chrome decides silently; Firefox may ask once. Only once there is
 * something worth keeping.
 */
export async function keepStorage() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    // Not supported: the backup nudge covers it.
  }
}
