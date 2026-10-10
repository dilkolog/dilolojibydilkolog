import { exportBackup, mediaBlob, parseBackup, restoreBackup, type KelimeDB } from './db'

/** A copy of this device's data taken just before something replaces it. */
export interface SafetySnapshot {
  at: string
  json: string
  /** Whether pictures and recordings are in the copy (left out when they are too many to keep twice). */
  withMedia: boolean
  words: number
}

const KEY = 'safetyBackup'
/** Above this many bytes of pictures and recordings the copy keeps the words and progress only. */
const MEDIA_LIMIT = 25_000_000

/**
 * Keeps one copy of the current data under meta (not part of backups or sync) so a restore that
 * turns out wrong can be taken back. Only the latest copy is kept.
 */
export async function saveSafetySnapshot(db: KelimeDB, now = new Date()): Promise<SafetySnapshot> {
  let size = 0
  await db.media.each((m) => {
    if (!m.id.startsWith('tts:') && !m.id.startsWith('aud:')) size += mediaBlob(m).size
  })
  const withMedia = size <= MEDIA_LIMIT
  const json = await exportBackup(db, now, { media: withMedia })
  const snapshot: SafetySnapshot = { at: now.toISOString(), json, withMedia, words: await db.vocabulary.count() }
  await db.meta.put({ key: KEY, value: snapshot })
  return snapshot
}

export async function getSafetySnapshot(db: KelimeDB): Promise<SafetySnapshot | null> {
  const v = (await db.meta.get(KEY))?.value as SafetySnapshot | undefined
  return v && typeof v.json === 'string' ? v : null
}

/** Puts the data back as it was in the last copy and drops the copy. Returns false if there is none. */
export async function restoreSafetySnapshot(db: KelimeDB): Promise<boolean> {
  const snapshot = await getSafetySnapshot(db)
  if (!snapshot) return false
  await restoreBackup(db, parseBackup(snapshot.json), { keepMedia: !snapshot.withMedia })
  await db.meta.delete(KEY)
  return true
}
