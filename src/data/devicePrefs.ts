import type { KelimeDB } from './db'

/**
 * What a person chose or saw on a device and the app keeps next to the database (localStorage and a few rows that are not
 * part of a backup's lists): the theme and the reading look, which badges were celebrated, the friends' nicknames, the writing
 * notebook... It follows the account, so a device a person signs out of (which is emptied) or a new device meets them as they
 * left things. Each key carries the moment its value was last seen to change; on a sync the later one wins.
 */
export interface PrefEntry {
  /** The value; an empty text means the key was removed (so a removal reaches the other devices too). */
  v: string
  at: string
}
export type Prefs = Record<string, PrefEntry>

/** The localStorage keys that travel, by prefix. Not here, on purpose: sign-in tokens, links waiting to be used, caches, audio positions, API keys, the device's voices. */
const LOCAL_PREFIXES = [
  'diloloji:guide-reports',
  'diloloji:guide-questions:',
  'diloloji:guide-placement',
  'diloloji:guide-lesson-nudge:',
  'diloloji:guide-view',
  'diloloji:shadow-scores',
  'diloloji:pitch-scores',
  'diloloji:league-wins',
  'diloloji:friend-nicknames',
  'diloloji:friend-goal',
  'diloloji:team-push',
  'diloloji:duel-history',
  'diloloji:duel-name',
  'diloloji:monki:',
  'diloloji:monki-voice',
  'diloloji:monki-nudge',
  'diloloji:podcast:',
  'diloloji:ladder:',
  'diloloji:numbers',
  'diloloji:mind-seed:',
  'diloloji:weekly-care:',
  'diloloji:list-test',
  'diloloji:memory-tried',
  'diloloji:repair-tried',
  'diloloji:fill-missing-dismissed',
  'diloloji:flash-mode',
  'diloloji:exam-mode',
  'diloloji:test-kinds',
  'diloloji:study-options',
  'diloloji:words-view',
  'diloloji:translate-cleared',
  'diloloji:whats-new',
  'diloloji:deduce',
  'diloloji:song-link',
  'kelime-koc:week-seen',
  'kelime-koc:week-note',
  'kelime-koc:badges-seen',
  'kelime-koc:level-seen',
  'kelime-koc:bridge-seen',
  'kelime-koc:lab-tour',
  'kelime-koc:lab-swiped',
  'kelime-koc:last-list',
  'kelime-koc:theme',
  'kelime-koc:density',
  'kelime-koc:reader',
  'kelime-koc:word-order',
  'kelime-koc:words-',
  'kelime-koc:garden-hard',
  'kelime-koc:home-more',
  'kelime-koc:share-card',
  'kelime-koc:backup-nudge-dismissed',
  'kelime-koc:image-skipped',
]

/** Rows of the `meta` table that are not part of a backup otherwise (they travel as `meta:<key>`). */
const META_KEYS = ['writingErrors', 'pronScores', 'myShares', 'collabs']

/** One value is never longer than this (the sync file has a limit and a runaway cache must not eat it). */
const MAX_VALUE = 120_000

/** Where the last read of this device's values is kept, with the moment each changed (the `sync` prefix: not counted as a write). */
const SNAPSHOT = 'syncPrefs'

/** A removal is remembered this long, then forgotten (by then every device has had a sync). */
const GONE_DAYS = 90

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

export const isPrefKey = (key: string): boolean => (key.startsWith('meta:') ? META_KEYS.includes(key.slice(5)) : LOCAL_PREFIXES.some((p) => key.startsWith(p)))

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/**
 * The values as they stand on this device now, each with the moment it was noticed to change. A key that was here at the last
 * read and is gone now becomes a removal (`v: ''`), so it is removed on the other devices too, unless storage could not be read.
 */
export async function collectPrefs(db: KelimeDB, now = new Date()): Promise<Prefs> {
  const before = ((await db.meta.get(SNAPSHOT))?.value as Prefs | undefined) ?? {}
  const seen = new Map<string, string>()
  // Keys that are here but too large to travel: they are left alone, never taken for a removal.
  const kept = new Set<string>()
  let storageRead = false
  const ls = storage()
  if (ls) {
    try {
      for (const key of Object.keys(ls)) {
        if (!isPrefKey(key)) continue
        const v = ls.getItem(key)
        if (v && v.length <= MAX_VALUE) seen.set(key, v)
        else if (v) kept.add(key)
      }
      storageRead = true
    } catch {
      // Storage blocked: only what is in the database travels.
    }
  }
  for (const key of META_KEYS) {
    const row = await db.meta.get(key)
    if (row === undefined) continue
    const v = JSON.stringify(row.value)
    if (v && v.length <= MAX_VALUE) seen.set(`meta:${key}`, v)
    else kept.add(`meta:${key}`)
  }
  // Storage that was emptied behind the app's back (site data cleared, the browser evicting it) is not the person
  // removing every choice: with none of the earlier local keys left, nothing local is sent as a removal.
  const localBefore = Object.entries(before).filter(([k, e]) => !k.startsWith('meta:') && e.v !== '').length
  const localNow = [...seen.keys(), ...kept].filter((k) => !k.startsWith('meta:')).length
  const localRemovals = storageRead && !(localNow === 0 && localBefore >= 3)
  const out: Prefs = {}
  for (const [key, v] of seen) out[key] = before[key]?.v === v ? before[key]! : { v, at: now.toISOString() }
  const forget = forgetBefore(now)
  for (const [key, e] of Object.entries(before)) {
    if (seen.has(key) || kept.has(key) || !isPrefKey(key)) continue
    if (e.v === '') {
      if (e.at >= forget) out[key] = e
    } else if (key.startsWith('meta:') || localRemovals) out[key] = { v: '', at: now.toISOString() }
    // A local key whose storage could not be read is left out: it is neither kept nor removed elsewhere.
  }
  if (JSON.stringify(out) !== JSON.stringify(before)) await db.meta.put({ key: SNAPSHOT, value: out })
  return out
}

/** Removals older than this moment are forgotten, on every device alike (else a sync would keep bringing them back). */
const forgetBefore = (now: Date) => new Date(now.getTime() - GONE_DAYS * 86_400_000).toISOString()

/** The entries of a backup that can be trusted: known keys, text values, a moment. */
export function cleanPrefs(raw: unknown): Prefs | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: Prefs = {}
  for (const [key, e] of Object.entries(raw as Record<string, unknown>)) {
    const entry = e as Partial<PrefEntry> | null
    if (isPrefKey(key) && entry && typeof entry.v === 'string' && entry.v.length <= MAX_VALUE && typeof entry.at === 'string' && ISO.test(entry.at)) out[key] = { v: entry.v, at: entry.at }
  }
  return out
}

/** Two devices' values: for each key, the one that changed later. */
export function mergePrefs(older: Prefs | undefined, newer: Prefs | undefined, now = new Date()): Prefs {
  const out: Prefs = { ...older }
  for (const [key, e] of Object.entries(newer ?? {})) if (!out[key] || e.at >= out[key]!.at) out[key] = e
  const forget = forgetBefore(now)
  for (const [key, e] of Object.entries(out)) if (e.v === '' && e.at < forget) delete out[key]
  return out
}

/**
 * Puts a backup's values on this device (inside a restore: the rows go through the open transaction), and removes the keys it
 * says were removed. Only what this device really holds afterwards is remembered as its last read: a value that could not be
 * written must not look like a removal at the next read.
 */
export async function applyPrefs(db: KelimeDB, prefs: Prefs | undefined): Promise<void> {
  const clean = cleanPrefs(prefs)
  if (!clean) return
  const ls = storage()
  const held: Prefs = {}
  for (const [key, e] of Object.entries(clean)) {
    try {
      if (key.startsWith('meta:')) {
        const name = key.slice(5)
        const row = await db.meta.get(name)
        if (e.v === '') {
          if (row !== undefined) await db.meta.delete(name)
        } else if (JSON.stringify(row?.value) !== e.v) await db.meta.put({ key: name, value: JSON.parse(e.v) })
      } else {
        if (!ls) continue
        if (e.v === '') ls.removeItem(key)
        else if (ls.getItem(key) !== e.v) ls.setItem(key, e.v)
      }
      held[key] = e
    } catch {
      // A value that cannot be written (storage full or blocked, a damaged row) is skipped; the rest goes on.
    }
  }
  await db.meta.put({ key: SNAPSHOT, value: held })
}
