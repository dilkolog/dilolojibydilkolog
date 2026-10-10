import { mergeSeen, type LabData } from '../engine/labProgress'
import { mergeMemories } from '../engine/translationMemory'
import { mergeEarLogs } from '../engine/earMisses'
import { mergeBadgeLogs } from '../engine/gamification'
import { mergeNotes, type DictionaryNotes } from '../engine/dictionaryNotes'
import { exportBackup, mediaBlob, parseBackup, restoreBackup, type Backup, type KelimeDB } from './db'
import { saveSafetySnapshot } from './safetyBackup'
import { isDead, mergeTombs, tombList, tombMap } from './tombstones'

/**
 * Sync between devices through a small server store. Everything is compressed and encrypted on
 * the device with a key derived from the learner's sync code; the server only holds opaque bytes
 * under an id derived from the code, and never sees the code itself.
 *
 * Two kinds of files: "core" (everything but pictures and recordings) and one file per media
 * item, which keeps each upload under the server's request size limit.
 */

/** Bytes backed by a plain ArrayBuffer (what the Web Crypto and Blob APIs accept). */
type Bytes = Uint8Array<ArrayBuffer>

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** A new sync code: 20 characters (~100 bits), grouped for reading aloud or typing. */
export function generateSyncCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
  return chars.match(/.{5}/g)!.join('-')
}

export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '')

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** The storage id: a hash of the code, so the server can't recover the code from it. */
export async function syncIdOf(code: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`kelime-koc-id:${normalizeCode(code)}`)))
}

// ---------------------------------------------------------------------------
// Accounts: a username and a password instead of a code
// ---------------------------------------------------------------------------

/**
 * An account. The id comes from the username (so another device finds it), the encryption key
 * and a separate write/read token from the password; only the token's hash ever reaches the
 * server, which refuses anyone without it. The password itself is never stored or sent.
 */
export interface Account {
  kind: 'account'
  username: string
  id: string
  /** Hex of the AES key bytes. */
  enc: string
  /** Hex of the access token (the server keeps its hash). */
  auth: string
}

/** A sync code or an account. */
export type Credential = string | Account

export class SyncAuthError extends Error {
  override name = 'SyncAuthError'
}

/** The server only serves the accounts and codes on its list (SYNC_ALLOWED), and this isn't one. */
export class SyncNotAllowedError extends Error {
  override name = 'SyncNotAllowedError'
}

/** A 403 is either a wrong password or an id the server doesn't serve. */
async function refusal(res: Response): Promise<Error> {
  return (await res.text().catch(() => '')) === 'not allowed' ? new SyncNotAllowedError('not allowed') : new SyncAuthError('wrong password')
}

/** Case doesn't matter, and the Turkish I's all count as one (ALI, Ali, alı, ALİ → ali). */
export const normalizeUsername = (u: string) => u.trim().normalize('NFC').replace(/[İIı]/g, 'i').toLowerCase()

const fromHex = (h: string): Bytes => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)))

export async function deriveAccount(username: string, password: string): Promise<Account> {
  const u = normalizeUsername(username)
  const id = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`kelime-koc-account:${u}`)))
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(`kelime-koc-account-v1:${u}`), iterations: 310_000, hash: 'SHA-256' }, base, 512))
  return { kind: 'account', username: u, id, enc: hex(bits.slice(0, 32).buffer), auth: hex(bits.slice(32).buffer) }
}

export async function credentialId(cred: Credential): Promise<string> {
  return typeof cred === 'string' ? syncIdOf(cred) : cred.id
}

const authHeaders = (cred: Credential): Record<string, string> => (typeof cred === 'string' ? {} : { 'x-sync-auth': cred.auth })

async function keyOf(cred: Credential): Promise<CryptoKey> {
  if (typeof cred !== 'string') return crypto.subtle.importKey('raw', fromHex(cred.enc), 'AES-GCM', false, ['encrypt', 'decrypt'])
  const code = cred
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(normalizeCode(code)), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode('kelime-koc-sync-v1'), iterations: 150_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function pipe(data: Bytes, stream: CompressionStream | DecompressionStream): Promise<Bytes> {
  return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer())
}

/** gzip, then AES-GCM; output = 12-byte IV followed by the ciphertext. */
export async function seal(data: Bytes, code: Credential): Promise<Bytes> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const zipped = await pipe(data, new CompressionStream('gzip'))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyOf(code), zipped))
  const out = new Uint8Array(12 + ct.length)
  out.set(iv)
  out.set(ct, 12)
  return out
}

export async function open(sealed: Bytes, code: Credential): Promise<Bytes> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.slice(0, 12) }, await keyOf(code), sealed.slice(12))
  return pipe(new Uint8Array(plain), new DecompressionStream('gzip'))
}

// ---------------------------------------------------------------------------
// Merging
// ---------------------------------------------------------------------------

function unionBy<T>(a: readonly T[] = [], b: readonly T[] = [], key: (x: T) => string, pick: (x: T, y: T) => T = (x) => x): T[] {
  const map = new Map<string, T>()
  for (const x of a) map.set(key(x), x)
  for (const y of b) {
    const k = key(y)
    const x = map.get(k)
    map.set(k, x === undefined ? y : pick(x, y))
  }
  return [...map.values()]
}


const time = (d: Date | string | undefined) => (d ? new Date(d).getTime() : 0)

/**
 * Merges two snapshots so nothing learned on either device is lost: answers are combined,
 * each word keeps its most recently reviewed state, and what was deleted on either side stays
 * deleted unless it was added again later (see tombstones.ts). Where one item differs on both sides, the newer snapshot wins.
 */
/** The verb lab of two devices: favourites and recent verbs joined, each form keeping its more practised record, counts keeping the larger. */
export function mergeLab(older: LabData | undefined, newer: LabData | undefined): LabData | undefined {
  if (!older || !newer) return newer ?? older
  const records: LabData['records'] = { ...older.records }
  for (const [key, r] of Object.entries(newer.records)) {
    const o = records[key]
    const answers = (x: typeof r) => x.ok + x.wrong
    records[key] = !o || answers(r) > answers(o) || (answers(r) === answers(o) && time(r.card?.last_review) >= time(o.card?.last_review)) ? r : o
  }
  const most = <T extends Record<string, number>>(a: T = {} as T, b: T = {} as T) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, Math.max(a[k] ?? 0, b[k] ?? 0)]))
  const tally: NonNullable<LabData['tally']> = {}
  for (const k of new Set([...Object.keys(older.tally ?? {}), ...Object.keys(newer.tally ?? {})])) {
    const a = older.tally?.[k]
    const b = newer.tally?.[k]
    tally[k] = { ok: Math.max(a?.ok ?? 0, b?.ok ?? 0), wrong: Math.max(a?.wrong ?? 0, b?.wrong ?? 0) }
  }
  const days: NonNullable<LabData['days']> = {}
  for (const k of new Set([...Object.keys(older.days ?? {}), ...Object.keys(newer.days ?? {})])) {
    const a = older.days?.[k]
    const b = newer.days?.[k]
    days[k] = { ok: Math.max(a?.ok ?? 0, b?.ok ?? 0), wrong: Math.max(a?.wrong ?? 0, b?.wrong ?? 0) }
  }
  return {
    favorites: [...new Set([...newer.favorites, ...older.favorites])],
    recent: [...new Set([...newer.recent, ...older.recent])].slice(0, 12),
    records,
    tally,
    kinds: most(older.kinds as Record<string, number>, newer.kinds as Record<string, number>),
    seen: Object.fromEntries([...new Set([...Object.keys(older.seen ?? {}), ...Object.keys(newer.seen ?? {})])].map((v) => [v, mergeSeen(older.seen?.[v], newer.seen?.[v])])),
    days,
    tourDays: [...new Set([...(older.tourDays ?? []), ...(newer.tourDays ?? [])])].sort(),
  }
}

type WordState = Backup['wordStates'][number]

/**
 * One word's state on two devices: the more recently reviewed side's state wins, but the skills
 * only the other side practised are kept (each skill's card is the more recently reviewed one),
 * the counters never go down (they are totals of answers both devices keep as events), and the
 * word counts as introduced from the earlier date.
 */
export function mergeWordState(x: WordState, y: WordState): WordState {
  const yWins = time(y.lastReviewAt) > time(x.lastReviewAt) || (time(y.lastReviewAt) === time(x.lastReviewAt) && y.stats.reviews >= x.stats.reviews)
  const [lose, win] = yWins ? [x, y] : [y, x]
  const skills: WordState['skills'] = { ...lose.skills }
  for (const [skill, card] of Object.entries(win.skills ?? {}) as [keyof WordState['skills'], NonNullable<WordState['skills'][keyof WordState['skills']]>][]) {
    const other = lose.skills?.[skill]
    skills[skill] = !other || time(card.last_review) >= time(other.last_review) ? card : other
  }
  const most = (k: keyof WordState['stats']) => Math.max(win.stats[k] ?? 0, lose.stats[k] ?? 0)
  return {
    ...win,
    skills,
    introducedAt: time(lose.introducedAt) && time(lose.introducedAt) < time(win.introducedAt) ? lose.introducedAt : win.introducedAt,
    stats: { ...win.stats, reviews: most('reviews'), correct: most('correct'), wrong: most('wrong'), hints: most('hints'), totalResponseMs: most('totalResponseMs') },
  }
}

/** Favourite verbs taken out on one device (mark "fav:fr:parler") are gone from the merged list. */
function withoutRemoved(lab: LabData | undefined, language: string, dead: (id: string, createdAt?: Date | string) => boolean): LabData | undefined {
  return lab && { ...lab, favorites: lab.favorites.filter((v) => !dead(`fav:${language}:${v}`)) }
}

/** A dictionary correction taken back (mark "fix:fr:word") stays gone, unless it was written again later. */
function withoutTakenBack(notes: DictionaryNotes | undefined, language: string, dead: (id: string, createdAt?: Date | string) => boolean): DictionaryNotes | undefined {
  return notes && { ...notes, fixes: Object.fromEntries(Object.entries(notes.fixes).filter(([w, f]) => !dead(`fix:${language}:${w}`, f.at))) }
}

/** Settings field by field: each takes the value from the side that changed it last (no stamp on either: the newer snapshot's). */
function mergeSettings(older: Backup, newer: Backup): Pick<Backup, 'settings' | 'settingsAt'> {
  if (!older.settings || !newer.settings) return { settings: newer.settings ?? older.settings, settingsAt: newer.settingsAt ?? older.settingsAt }
  const settings: Record<string, unknown> = { ...older.settings, ...newer.settings }
  const settingsAt: Record<string, string> = {}
  for (const k of Object.keys(settings)) {
    const o = older.settingsAt?.[k]
    const n = newer.settingsAt?.[k]
    if (time(o) > time(n)) settings[k] = (older.settings as unknown as Record<string, unknown>)[k]
    const at = time(o) > time(n) ? o : n
    if (at) settingsAt[k] = at
  }
  return { settings: settings as unknown as Backup['settings'], settingsAt }
}

export function mergeBackups(local: Backup, remote: Backup): Backup {
  const [older, newer] = time(local.exportedAt) >= time(remote.exportedAt) ? [remote, local] : [local, remote]
  const tombs = mergeTombs(tombMap(local.deleted, time(local.exportedAt)), tombMap(remote.deleted, time(remote.exportedAt)))
  const dead = (id: string, createdAt?: Date | string) => isDead(tombs, id, createdAt)
  // "Reset this language's progress" leaves a mark ("reset:fr"): answers and states at least as old as
  // it are gone on every device, while what was learned after it stays.
  const resetOf = (language: string | undefined, at?: Date | string) => !!language && dead(`reset:${language}`, at)
  const languageOf = new Map([...older.vocabulary, ...newer.vocabulary].map((v) => [v.id, v.language]))
  const latest = (...ats: (Date | string | undefined)[]) => new Date(Math.max(0, ...ats.map((a) => time(a)))).toISOString()
  const known: NonNullable<Backup['reading']>['known'] = {}
  for (const r of [older.reading, newer.reading]) for (const [l, keys] of Object.entries(r?.known ?? {})) known[l as keyof typeof known] = [...new Set([...(known[l as keyof typeof known] ?? []), ...(keys ?? [])])]
  const ignored: NonNullable<NonNullable<Backup['reading']>['ignored']> = {}
  for (const r of [older.reading, newer.reading]) for (const [l, keys] of Object.entries(r?.ignored ?? {})) ignored[l as keyof typeof ignored] = [...new Set([...(ignored[l as keyof typeof ignored] ?? []), ...(keys ?? [])])]
  // Words taken out of the known/ignored lists on one device stay out on the others (marks "known:fr:word").
  for (const [l, keys] of Object.entries(known)) known[l as keyof typeof known] = keys.filter((k) => !dead(`known:${l}:${k}`))
  for (const [l, keys] of Object.entries(ignored)) ignored[l as keyof typeof ignored] = keys.filter((k) => !dead(`ignored:${l}:${k}`))
  const encounters: Record<string, number> = { ...(older.reading?.encounters ?? {}) }
  for (const [id, n] of Object.entries(newer.reading?.encounters ?? {})) encounters[id] = Math.max(encounters[id] ?? 0, n)

  return {
    app: 'kelime-koc',
    version: Math.max(local.version, remote.version),
    exportedAt: new Date().toISOString(),
    ...mergeSettings(older, newer),
    vocabulary: unionBy(older.vocabulary, newer.vocabulary, (v) => v.id, (_, y) => y).filter((v) => !dead(v.id, v.addedAt)),
    wordStates: unionBy(older.wordStates, newer.wordStates, (s) => s.entryId, mergeWordState).filter(
      (s) => !dead(s.entryId, s.introducedAt) && !resetOf(s.language, latest(s.lastReviewAt, s.introducedAt)),
    ),
    events: unionBy(older.events, newer.events, (e) => e.id).filter((e) => !dead(e.entryId, e.timestamp) && !resetOf(e.language, e.timestamp)),
    mistakes: unionBy(older.mistakes, newer.mistakes, (m) => m.id, (x, y) => (y.count > x.count || (y.count === x.count && time(y.lastAt) >= time(x.lastAt)) ? y : x)).filter(
      (m) => !dead(m.entryId, m.lastAt) && !resetOf(languageOf.get(m.entryId), m.lastAt),
    ),
    stories: unionBy(older.stories, newer.stories, (s) => s.id, (x, y) => (y.completedAt || !x.completedAt ? y : x)),
    reading: {
      known,
      ignored,
      encounters,
      library: unionBy(older.reading?.library, newer.reading?.library, (t) => t.id, (x, y) => (y.history.length >= x.history.length ? y : x)).filter((t) => !dead(t.id, t.addedAt)),
    },
    vocabTests: unionBy(older.vocabTests, newer.vocabTests, (t) => `${t.language}|${t.at}`),
    journal: unionBy(older.journal, newer.journal, (j) => j.id, (x, y) => (y.review || !x.review ? y : x)),
    bossWins: unionBy(older.bossWins, newer.bossWins, (w) => `${w.entryId}|${w.at}`),
    missions: unionBy(older.missions, newer.missions, (m) => `${m.mission}|${m.at}`),
    sentences: unionBy(older.sentences, newer.sentences, (s) => s.id, (x, y) => (time(y.card.last_review) >= time(x.card.last_review) ? y : x)).filter((s) => !dead(s.id, s.addedAt)),
    exams: unionBy(older.exams, newer.exams, (e) => `${e.language}|${e.at}`),
    lists: unionBy(older.lists, newer.lists, (l) => l.id, (x, y) => (time(y.updatedAt) >= time(x.updatedAt) ? y : x)).filter((l) => !dead(l.id, l.createdAt)),
    deleted: tombList(tombs),
    lab: { fr: withoutRemoved(mergeLab(older.lab?.fr, newer.lab?.fr), 'fr', dead), es: withoutRemoved(mergeLab(older.lab?.es, newer.lab?.es), 'es', dead) },
    dictionary: Object.fromEntries((['en', 'fr', 'es'] as const).map((l) => [l, withoutTakenBack(mergeNotes(older.dictionary?.[l], newer.dictionary?.[l]), l, dead)])),
    records: Object.fromEntries([...new Set([...Object.keys(older.records ?? {}), ...Object.keys(newer.records ?? {})])].map((k) => [k, Math.max(older.records?.[k] ?? 0, newer.records?.[k] ?? 0)])),
    badges: mergeBadgeLogs(older.badges, newer.badges),
    translations: mergeMemories(older.translations, newer.translations),
    earMisses: mergeEarLogs(older.earMisses, newer.earMisses),
    media: [],
  }
}

// ---------------------------------------------------------------------------
// Talking to the server
// ---------------------------------------------------------------------------

/** The part's bytes and the ETag the server read them with (none for a 404, or a store that gives none). */
async function fetchPart(id: string, part: string, code: Credential): Promise<{ bytes: Bytes; etag?: string } | null> {
  const res = await fetch(`/api/sync?id=${id}&part=${encodeURIComponent(part)}`, { headers: authHeaders(code) })
  if (res.status === 404) return null
  if (res.status === 403) throw await refusal(res)
  if (!res.ok) throw new Error(`sync ${res.status}`)
  return { bytes: await open(new Uint8Array(await res.arrayBuffer()), code), etag: res.headers.get('etag') ?? undefined }
}

async function download(id: string, part: string, code: Credential): Promise<Bytes | null> {
  return (await fetchPart(id, part, code))?.bytes ?? null
}

/** What the server takes in one request (MAX_BYTES in api/sync.ts): the core file must fit. */
export const CORE_LIMIT_BYTES = 4_400_000

/** How full the core file is: its share of the limit, shown in Settings; from 80% a warning. */
export function syncUsage(bytes: number): { percent: number; label: string; warn: boolean } {
  const mb = (n: number) => (n / 1_000_000).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const percent = Math.min(100, Math.round((bytes / CORE_LIMIT_BYTES) * 100))
  return { percent, label: `${mb(bytes)} MB / ${mb(CORE_LIMIT_BYTES)} MB`, warn: percent >= 80 }
}

/** The synced data no longer fits the server's limit (HTTP 413). */
export class SyncTooLargeError extends Error {
  override name = 'SyncTooLargeError'
}

/** Another device wrote the file after this one read it (HTTP 412). */
export class SyncConflictError extends Error {
  override name = 'SyncConflictError'
}

/** Sends one sealed part; returns its size in bytes. */
async function upload(id: string, part: string, data: Bytes, code: Credential, ifMatch?: string): Promise<number> {
  const sealed = await seal(data, code)
  const res = await fetch(`/api/sync?id=${id}&part=${encodeURIComponent(part)}`, { method: 'PUT', body: sealed, headers: { 'content-type': 'application/octet-stream', ...authHeaders(code), ...(ifMatch ? { 'if-match': ifMatch } : {}) } })
  if (res.status === 403) throw await refusal(res)
  if (res.status === 412) throw new SyncConflictError('changed meanwhile')
  if (res.status === 413 && part === 'core') throw new SyncTooLargeError('core too large')
  if (!res.ok) throw new Error(`sync ${res.status}`)
  return sealed.length
}

/** Media ids become file names on the server; hashing keeps them to a safe alphabet. */
async function mediaPart(mediaId: string): Promise<string> {
  return `m-${hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(mediaId))).slice(0, 40)}`
}

/**
 * The most a single picture or recording may weigh to be synced: it travels as base64 inside one
 * request, which the server caps (MAX_BYTES in api/sync.ts, 4.4 MB), and base64 adds a third.
 */
export const MAX_MEDIA_BYTES = 3_000_000

export interface SyncResult {
  /** Media items fetched from / sent to the other devices. */
  received: number
  sent: number
  /** Media items left out (too big, or failing to travel): the rest of the sync went through anyway. */
  skipped: number
  /** What the other devices changed on this one: new words, words they deleted, texts, settings fields. */
  incoming: { words: number; removed: number; texts: number; settings: number }
}

/** What merging brought in from the other devices, counted against what this device had. */
export function incomingChanges(local: Backup, merged: Backup): SyncResult['incoming'] {
  const had = new Set(local.vocabulary.map((v) => v.id))
  const has = new Set(merged.vocabulary.map((v) => v.id))
  const texts = new Set((local.reading?.library ?? []).map((t) => t.id))
  const was = (local.settings ?? {}) as unknown as Record<string, unknown>
  const now = (merged.settings ?? {}) as unknown as Record<string, unknown>
  return {
    words: merged.vocabulary.filter((v) => !had.has(v.id)).length,
    removed: local.vocabulary.filter((v) => !has.has(v.id)).length,
    texts: (merged.reading?.library ?? []).filter((t) => !texts.has(t.id)).length,
    settings: Object.keys(now).filter((k) => JSON.stringify(now[k]) !== JSON.stringify(was[k])).length,
  }
}

/**
 * Pull, merge, write locally, push. Safe to run any time: running it twice in a row changes
 * nothing the second time.
 */
/** The days the server kept a restore point for (newest first; see api/sync.ts). */
export async function restorePoints(code: Credential): Promise<string[]> {
  const res = await fetch(`/api/sync?id=${await credentialId(code)}&history=1`, { headers: authHeaders(code) })
  if (res.status === 403) throw await refusal(res)
  if (!res.ok) throw new Error(`sync ${res.status}`)
  return ((await res.json()) as { days?: string[] }).days ?? []
}

/**
 * Brings back what was there on `day`: that day's copy merged into this device's data. Words,
 * sentences and texts in it come back even if deleted since (they get an "alive again" mark, newer
 * than the deletion, so other devices keep them too); what was added or edited later stays.
 * The next sync sends the result to the other devices.
 */
export async function restoreFrom(db: KelimeDB, code: Credential, day: string, now = new Date()): Promise<number> {
  const bytes = await download(await credentialId(code), `h-${day}`, code)
  if (!bytes) throw new Error('no such restore point')
  const point = parseBackup(new TextDecoder().decode(bytes))
  const at = now.toISOString()
  const ids = [...point.vocabulary.map((v) => v.id), ...(point.sentences ?? []).map((x) => x.id), ...(point.reading?.library ?? []).map((t) => t.id)]
  point.deleted = [...(point.deleted ?? []).filter((t) => !ids.includes(typeof t === 'string' ? t : t.id)), ...ids.map((id) => ({ id, at, alive: true }))]
  const local = parseBackup(await exportBackup(db, now, { media: false }))
  const before = new Set(local.vocabulary.map((v) => v.id))
  const merged = mergeBackups(local, point)
  await saveSafetySnapshot(db, now)
  await restoreBackup(db, merged, { keepMedia: true })
  return merged.vocabulary.filter((v) => !before.has(v.id)).length
}

/**
 * Whether an account exists and the password opens it: 'new' (nobody has it), 'ok', or 'wrong'
 * (wrong password, or the name belongs to someone else).
 */
export async function accountStatus(account: Account): Promise<'new' | 'ok' | 'wrong'> {
  try {
    return (await download(account.id, 'core', account)) ? 'ok' : 'new'
  } catch (e) {
    if (e instanceof SyncAuthError || (e instanceof DOMException && e.name === 'OperationError')) return 'wrong'
    throw e
  }
}

export async function syncNow(db: KelimeDB, code: Credential): Promise<SyncResult> {
  // Two devices syncing at once: the one that loses the race on the core file merges again with what the other wrote.
  for (let attempt = 1; ; attempt++) {
    try {
      return await syncOnce(db, code)
    } catch (e) {
      if (!(e instanceof SyncConflictError) || attempt >= 3) throw e
    }
  }
}

async function syncOnce(db: KelimeDB, code: Credential): Promise<SyncResult> {
  const id = await credentialId(code)
  const fetched = await fetchPart(id, 'core', code)
  const remoteBytes = fetched?.bytes ?? null
  // The device's own data is read only now, after the download: what was answered while the network
  // was being waited for must be in it, or writing the merge back (it replaces the tables) would erase it.
  const local = parseBackup(await exportBackup(db, new Date(), { media: false }))
  // A device joining an existing sync takes the others' settings and edits rather than its own defaults.
  if (!(await db.meta.get('syncAt'))) local.exportedAt = new Date(0).toISOString()
  const remote = remoteBytes ? parseBackup(new TextDecoder().decode(remoteBytes)) : null
  const merged = remote ? mergeBackups(local, remote) : local
  if (remote) await restoreBackup(db, merged, { keepMedia: true })
  // The very first sync of a device is joining, not news: only later ones report what came in.
  const incoming = remote && (await db.meta.get('syncAt')) ? incomingChanges(local, merged) : { words: 0, removed: 0, texts: 0, settings: 0 }

  // Media: the remote list says which pictures/recordings exist elsewhere.
  const localMedia = new Set((await db.media.toCollection().primaryKeys()) as string[])
  const remoteMedia = new Set((remote as (Backup & { mediaIds?: string[] }) | null)?.mediaIds ?? [])
  let received = 0
  let skipped = 0
  // One broken or oversized item must not stop the rest, least of all the core file that carries the words.
  const isolated = async (work: () => Promise<void>) => {
    try {
      await work()
    } catch (e) {
      if (e instanceof SyncAuthError || e instanceof SyncNotAllowedError) throw e
      skipped++
    }
  }
  for (const mid of remoteMedia) {
    if (localMedia.has(mid)) continue
    await isolated(async () => {
      const bytes = await download(id, await mediaPart(mid), code)
      if (!bytes) return
      const { kind, type, data } = JSON.parse(new TextDecoder().decode(bytes)) as { kind: 'image' | 'audio'; type: string; data: string }
      const raw = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
      await db.media.put({ id: mid, kind, type, data: raw.buffer, createdAt: new Date() })
      localMedia.add(mid)
      received++
    })
  }
  let sent = 0
  const unsent = new Set<string>()
  for (const mid of localMedia) {
    if (remoteMedia.has(mid) || mid.startsWith('tts:') || mid.startsWith('aud:')) continue
    await isolated(async () => {
      const row = await db.media.get(mid)
      if (!row) return
      unsent.add(mid)
      const blob = mediaBlob(row)
      if (blob.size > MAX_MEDIA_BYTES) throw new Error('media too large')
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let bin = ''
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      await upload(id, await mediaPart(mid), new TextEncoder().encode(JSON.stringify({ kind: row.kind, type: blob.type, data: btoa(bin) })), code)
      unsent.delete(mid)
      sent++
    })
  }
  // Items that did not go up stay off the list, so other devices don't ask for what the server doesn't have.
  const mediaIds = [...localMedia].filter((m) => !m.startsWith('tts:') && !m.startsWith('aud:') && !unsent.has(m))
  const coreBytes = await upload(id, 'core', new TextEncoder().encode(JSON.stringify({ ...merged, mediaIds })), code, fetched?.etag)
  await db.meta.put({ key: 'syncSize', value: coreBytes })
  await db.meta.put({ key: 'syncAt', value: new Date().toISOString() })
  return { received, sent, skipped, incoming }
}
