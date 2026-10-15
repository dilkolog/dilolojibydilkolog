import { mergeSeen, type LabData } from '../engine/labProgress'
import { mergeTimeLogs } from '../engine/studyTime'
import type { ReviewEvent, VocabularyEntry } from '../engine/types'
import { mergeMemories } from '../engine/translationMemory'
import { mergeEarLogs } from '../engine/earMisses'
import { mergeGrammarLogs } from '../engine/grammar'
import { mergeDeductionLogs } from '../engine/deduction'
import { mergeBadgeLogs } from '../engine/gamification'
import { mergeNotes, type DictionaryNotes } from '../engine/dictionaryNotes'
import { BACKUP_VERSION, exportBackup, mediaBlob, parseBackup, restoreBackup, type Backup, type KelimeDB, type ReadingText } from './db'
import { saveSafetySnapshot } from './safetyBackup'
import { isDead, mergeTombs, tombList, tombMap } from './tombstones'
import { raiseCounters } from '../engine/counters'

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

const sha = async (text: string, length = 64) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))).slice(0, length)

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

/** The account has not been approved by the site's owner (yet): it may not use the sync store. */
export class SyncApprovalError extends SyncNotAllowedError {
  override name = 'SyncApprovalError'
}

/** A 403 is a wrong password, an id the server doesn't serve, or an account the owner has not approved. */
async function refusal(res: Response): Promise<Error> {
  const why = await res.text().catch(() => '')
  return why === 'approval required' ? new SyncApprovalError('approval required') : why === 'not allowed' ? new SyncNotAllowedError('not allowed') : new SyncAuthError('wrong password')
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
    xp: most(older.xp, newer.xp),
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
  return (
    notes && {
      ...notes,
      fixes: Object.fromEntries(Object.entries(notes.fixes).filter(([w, f]) => !dead(`fix:${language}:${w}`, f.at))),
      // A saved word taken out (mark "dictadd:fr:word") stays out too.
      added: Object.fromEntries(Object.entries(notes.added ?? {}).filter(([w, e]) => !dead(`dictadd:${language}:${w}`, e.at))),
    }
  )
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

  const events = unionBy(older.events, newer.events, (e) => e.id).filter((e) => !dead(e.entryId, e.timestamp) && !resetOf(e.language, e.timestamp))
  const wordStates = unionBy(older.wordStates, newer.wordStates, (s) => s.entryId, mergeWordState).filter(
    (s) => !dead(s.entryId, s.introducedAt) && !resetOf(s.language, latest(s.lastReviewAt, s.introducedAt)),
  )
  return {
    app: 'kelime-koc',
    version: Math.max(local.version, remote.version),
    exportedAt: new Date().toISOString(),
    ...mergeSettings(older, newer),
    // A word edited on both devices: the later edit wins (`editedAt`); without stamps, the newer snapshot's copy.
    vocabulary: unionBy(older.vocabulary, newer.vocabulary, (v) => v.id, (x, y) => (time(x.editedAt) > time(y.editedAt) ? x : y)).filter((v) => !dead(v.id, v.addedAt)),
    // Counts from both devices' answers (the merge of the states alone keeps only the larger count).
    wordStates: raiseCounters(wordStates, events),
    events,
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
    diagrams: unionBy(older.diagrams, newer.diagrams, (d) => d.id, (x, y) => (time(y.updatedAt) >= time(x.updatedAt) ? y : x)).filter((d) => !dead(d.id, d.createdAt)),
    lists: unionBy(older.lists, newer.lists, (l) => l.id, (x, y) => (time(y.updatedAt) >= time(x.updatedAt) ? y : x)).filter((l) => !dead(l.id, l.createdAt)),
    deleted: tombList(tombs),
    lab: { fr: withoutRemoved(mergeLab(older.lab?.fr, newer.lab?.fr), 'fr', dead), es: withoutRemoved(mergeLab(older.lab?.es, newer.lab?.es), 'es', dead) },
    dictionary: Object.fromEntries((['en', 'fr', 'es'] as const).map((l) => [l, withoutTakenBack(mergeNotes(older.dictionary?.[l], newer.dictionary?.[l]), l, dead)])),
    records: Object.fromEntries([...new Set([...Object.keys(older.records ?? {}), ...Object.keys(newer.records ?? {})])].map((k) => [k, Math.max(older.records?.[k] ?? 0, newer.records?.[k] ?? 0)])),
    timeLog: mergeTimeLogs(older.timeLog, newer.timeLog),
    badges: mergeBadgeLogs(older.badges, newer.badges),
    translations: mergeMemories(older.translations, newer.translations),
    earMisses: mergeEarLogs(older.earMisses, newer.earMisses),
    grammar: mergeGrammarLogs(older.grammar, newer.grammar),
    reflex: mergeGrammarLogs(older.reflex, newer.reflex),
    traps: mergeGrammarLogs(older.traps, newer.traps),
    pairs: mergeGrammarLogs(older.pairs, newer.pairs),
    deduction: mergeDeductionLogs(older.deduction, newer.deduction),
    register: mergeGrammarLogs(older.register, newer.register),
    flow: mergeGrammarLogs(older.flow, newer.flow),
    affixes: mergeGrammarLogs(older.affixes, newer.affixes),
    media: [],
  }
}

// ---------------------------------------------------------------------------
// Talking to the server
// ---------------------------------------------------------------------------

/** The error for a refused request, with the server's short reason when it gave one (shown to the learner and the owner). */
async function failure(res: Response): Promise<Error> {
  const reason = (await res.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 160)
  return new Error(reason ? `sync ${res.status}: ${reason}` : `sync ${res.status}`)
}

/** The part's bytes and the ETag the server read them with (none for a 404, or a store that gives none). */
async function fetchPart(id: string, part: string, code: Credential): Promise<{ bytes: Bytes; etag?: string } | null> {
  const res = await fetch(`/api/sync?id=${id}&part=${encodeURIComponent(part)}`, { headers: authHeaders(code) })
  if (res.status === 404) return null
  if (res.status === 403) throw await refusal(res)
  if (!res.ok) throw await failure(res)
  return { bytes: await open(new Uint8Array(await res.arrayBuffer()), code), etag: res.headers.get('etag') ?? undefined }
}

async function download(id: string, part: string, code: Credential): Promise<Bytes | null> {
  return (await fetchPart(id, part, code))?.bytes ?? null
}

/**
 * Where the parts are kept. The merge does not care: it reads a part (with a version to write against),
 * writes one (only if still as read, or only if new) and lists the restore points. `blobStore` is the
 * app's own server (Vercel Blob, encrypted); `supabaseStore` (supabaseStore.ts) keeps them in Supabase.
 */
export interface PartStore {
  kind: 'blob' | 'supabase'
  fetch(part: string): Promise<{ bytes: Bytes; etag?: string } | null>
  /** Returns the size written. `ifMatch`: only if still as read; `createOnly`: only if nobody made it yet. */
  put(part: string, data: Bytes, opts?: { ifMatch?: string; createOnly?: boolean }): Promise<number>
  /** Days with a restore point, newest first. */
  history(): Promise<string[]>
}

export function blobStore(code: Credential): PartStore {
  let id: Promise<string> | null = null
  const idOf = () => (id ??= credentialId(code))
  return {
    kind: 'blob',
    fetch: async (part) => fetchPart(await idOf(), part, code),
    put: async (part, data, opts) => upload(await idOf(), part, data, code, opts),
    history: async () => {
      const res = await fetch(`/api/sync?id=${await idOf()}&history=1`, { headers: authHeaders(code) })
      if (res.status === 403) throw await refusal(res)
      if (!res.ok) throw await failure(res)
      return ((await res.json()) as { days?: string[] }).days ?? []
    },
  }
}

const isStore = (x: Credential | PartStore): x is PartStore => typeof x === 'object' && 'fetch' in x

/** The account's data moved to Supabase: a device still on the old sign-in stops syncing here and says why. */
export class SyncMovedError extends Error {
  override name = 'SyncMovedError'
}
const MOVED = /"movedTo"\s*:\s*"supabase"/

/** Marks the old store's core as moved, so a device still signed in the old way stops writing there. */
export async function markMoved(code: Credential): Promise<void> {
  const store = blobStore(code)
  const core = await store.fetch('core')
  if (!core) return
  const text = new TextDecoder().decode(core.bytes)
  if (MOVED.test(text)) return
  const value = JSON.parse(text) as Record<string, unknown>
  await store.put('core', new TextEncoder().encode(JSON.stringify({ ...value, movedTo: 'supabase' })), { ifMatch: core.etag })
}


// ---------------------------------------------------------------------------
// Shards: the parts of the data that grow without end travel in files of their own
// ---------------------------------------------------------------------------

/**
 * The answers (one file a month, "ev-YYYY-MM") and the reading texts (one file each, "tx-…") are
 * not in the core file: it would outgrow the server's request limit, and every sync would send
 * all of it. The core lists them with a fingerprint each; a sync fetches and sends only the ones
 * whose fingerprint differs between this device and the server.
 */
interface Shard {
  events: ReviewEvent[]
  texts: ReadingText[]
  /** Identifies the content: equal fingerprints mean the same answers / the same text. */
  fp: string
}

/** JSON with the keys in order, so the same content gives the same text on every device. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v))
}

/** "ev-2026-10" for an answer's month (UTC); "ev-0000-00" when the time cannot be read. */
function eventPart(e: ReviewEvent): string {
  const t = new Date(e.timestamp as Date | string).getTime()
  return `ev-${Number.isFinite(t) ? new Date(t).toISOString().slice(0, 7) : '0000-00'}`
}

/** The data cut into its parts, by part name. */
async function splitShards(b: Backup): Promise<Map<string, Shard>> {
  const shards = new Map<string, Shard>()
  for (const e of b.events) {
    const name = eventPart(e)
    const shard = shards.get(name) ?? { events: [], texts: [], fp: '' }
    shard.events.push(e)
    shards.set(name, shard)
  }
  for (const t of b.reading?.library ?? []) shards.set(await hashedPart('tx', t.id), { events: [], texts: [t], fp: '' })
  for (const shard of shards.values()) {
    shard.fp = shard.texts.length ? await sha(canonical(shard.texts[0]), 24) : await sha(shard.events.map((e) => e.id).sort().join('\n'), 24)
  }
  return shards
}

/** The core file's own content: everything but what travels in parts. */
function withoutShards(b: Backup): Backup {
  return { ...b, events: [], reading: b.reading && { ...b.reading, library: [] } }
}

/** A part's file is a backup holding only that part: the same reader (dates, shape checks) serves it. */
function shardFile(shard: Shard): Uint8Array<ArrayBuffer> {
  const file: Backup = { app: 'kelime-koc', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), vocabulary: [], wordStates: [], events: shard.events, mistakes: [], reading: { known: {}, encounters: {}, library: shard.texts } }
  return new TextEncoder().encode(JSON.stringify(file))
}

/** What a part held on the server, with the ETag it was read with (`null`: nothing there yet). */
interface Pulled {
  events: ReviewEvent[]
  texts: ReadingText[]
  etag?: string
  exists: boolean
}

async function pullShard(store: PartStore, name: string): Promise<Pulled> {
  const fetched = await store.fetch(name)
  if (!fetched) return { events: [], texts: [], exists: false }
  const file = parseBackup(new TextDecoder().decode(fetched.bytes))
  return { events: file.events, texts: file.reading?.library ?? [], etag: fetched.etag, exists: true }
}

/** Fetches parts a few at a time. */
async function pullShards(store: PartStore, names: string[], into: Map<string, Pulled>) {
  for (let i = 0; i < names.length; i += 6) {
    await Promise.all(names.slice(i, i + 6).map(async (name) => void into.set(name, await pullShard(store, name))))
  }
}

/** What the server takes in one request (MAX_BYTES in api/sync.ts): every file must fit. */
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

/** Sends one sealed part; returns its size in bytes. `ifMatch`: only if the part is still as read; `createOnly`: only if nobody made it yet. */
async function upload(id: string, part: string, data: Bytes, code: Credential, { ifMatch, createOnly }: { ifMatch?: string; createOnly?: boolean } = {}): Promise<number> {
  const sealed = await seal(data, code)
  const headers = { 'content-type': 'application/octet-stream', ...authHeaders(code), ...(ifMatch ? { 'if-match': ifMatch } : {}), ...(createOnly ? { 'if-none-match': '*' } : {}) }
  const res = await fetch(`/api/sync?id=${id}&part=${encodeURIComponent(part)}`, { method: 'PUT', body: sealed, headers })
  if (res.status === 403) throw await refusal(res)
  if (res.status === 412) throw new SyncConflictError('changed meanwhile')
  if (res.status === 413 && !part.startsWith('m-')) throw new SyncTooLargeError(`${part} too large`)
  if (!res.ok) throw await failure(res)
  return sealed.length
}

/** Media ids become file names on the server; hashing keeps them to a safe alphabet. */
async function hashedPart(prefix: 'm' | 'tx', key: string): Promise<string> {
  return `${prefix}-${await sha(key, 40)}`
}
const mediaPart = (mediaId: string) => hashedPart('m', mediaId)

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
  /** Names of words another device had edited later than this one: its copy replaced this device's (kept apart, see `restoreReplaced`). */
  replaced?: string[]
}

/** The copies this device had of words another device edited later: what a sync replaced. */
export function replacedByRemote(local: Backup, merged: Backup): VocabularyEntry[] {
  const now = new Map(merged.vocabulary.map((v) => [v.id, v]))
  return local.vocabulary.filter((v) => {
    const m = now.get(v.id)
    return !!m && time(m.editedAt) > time(v.editedAt)
  })
}

const REPLACED_KEY = 'syncReplaced'
const REPLACED_KEPT = 30

/** Puts back the copies the last sync replaced (an edit made on another device that was not wanted); they count as edited now, so they win the next sync too. */
export async function restoreReplaced(db: KelimeDB): Promise<number> {
  const kept = (await db.meta.get(REPLACED_KEY))?.value as { entries?: VocabularyEntry[] } | undefined
  const entries = kept?.entries ?? []
  if (!entries.length) return 0
  const at = new Date().toISOString()
  await db.vocabulary.bulkPut(entries.map((e) => ({ ...e, editedAt: at })))
  await db.meta.delete(REPLACED_KEY)
  return entries.length
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
export async function restorePoints(code: Credential | PartStore): Promise<string[]> {
  return (isStore(code) ? code : blobStore(code)).history()
}

/**
 * Brings back what was there on `day`: that day's copy merged into this device's data. Words,
 * sentences and texts in it come back even if deleted since (they get an "alive again" mark, newer
 * than the deletion, so other devices keep them too); what was added or edited later stays.
 * The next sync sends the result to the other devices.
 */
export async function restoreFrom(db: KelimeDB, code: Credential | PartStore, day: string, now = new Date()): Promise<number> {
  const bytes = (await (isStore(code) ? code : blobStore(code)).fetch(`h-${day}`))?.bytes
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

export async function syncNow(db: KelimeDB, code: Credential | PartStore): Promise<SyncResult> {
  const store = isStore(code) ? code : blobStore(code)
  // Two devices syncing at once: the one that loses the race on the core file merges again with what the other wrote.
  for (let attempt = 1; ; attempt++) {
    try {
      return await syncOnce(db, store)
    } catch (e) {
      if (!(e instanceof SyncConflictError) || attempt >= 3) throw e
    }
  }
}

async function syncOnce(db: KelimeDB, store: PartStore): Promise<SyncResult> {
  const fetched = await store.fetch('core')
  const remoteText = fetched ? new TextDecoder().decode(fetched.bytes) : null
  if (remoteText && store.kind === 'blob' && MOVED.test(remoteText)) throw new SyncMovedError('moved to supabase')
  const remote = remoteText ? parseBackup(remoteText) : null
  // The parts the core lists, each with the fingerprint of what the server holds.
  const manifest = remote?.shards ?? {}
  const pulled = new Map<string, Pulled>()
  const empty: Backup = { app: 'kelime-koc', version: BACKUP_VERSION, exportedAt: new Date(0).toISOString(), vocabulary: [], wordStates: [], events: [], mistakes: [] }
  /** The server's side as one snapshot: the core, with the answers and texts of the parts fetched so far. */
  const remoteSnapshot = (): Backup | null => {
    if (!remote && !pulled.size) return null
    const base = remote ?? empty
    const parts = [...pulled.values()]
    return { ...base, events: [...base.events, ...parts.flatMap((p) => p.events)], reading: { known: {}, encounters: {}, ...base.reading, library: [...(base.reading?.library ?? []), ...parts.flatMap((p) => p.texts)] } }
  }
  let local!: Backup
  let merged!: Backup
  let shards!: Map<string, Shard>
  let mark = -1
  let localShards = new Map<string, Shard>()
  // The device's own data is read only after the download: what was answered while the network was being
  // waited for must be in it, or writing the merge back (it replaces the tables) would erase it. Reading,
  // merging and writing back take a moment too: a write seen in between sends it round again.
  for (let round = 1; ; round++) {
    if (db.writes !== mark) {
      mark = db.writes
      local = parseBackup(await exportBackup(db, new Date(), { media: false }))
      // A device joining an existing sync takes the others' settings and edits rather than its own defaults.
      if (!(await db.meta.get('syncAt'))) local.exportedAt = new Date(0).toISOString()
      localShards = await splitShards(local)
    }
    // The parts that differ between here and the server, or that the server's list does not know: fetch them to merge.
    const differing = [...new Set([...Object.keys(manifest), ...localShards.keys()])].filter((n) => manifest[n] !== localShards.get(n)?.fp && !pulled.has(n))
    await pullShards(store, differing, pulled)
    const snapshot = remoteSnapshot()
    merged = snapshot ? mergeBackups(local, snapshot) : local
    shards = await splitShards(merged)
    // A part the merge changed (an answer of a deleted word dropped, say) that was not fetched has no ETag to write against.
    const unread = [...shards].filter(([n, s]) => s.fp !== manifest[n] && !pulled.has(n)).map(([n]) => n)
    if (db.writes === mark && !unread.length) break
    if (round >= 4) {
      if (unread.length) throw new SyncConflictError('parts changed meanwhile')
      break
    }
    await pullShards(store, unread, pulled)
  }
  if (remote || pulled.size) await restoreBackup(db, merged, { keepMedia: true })
  // The very first sync of a device is joining, not news: only later ones report what came in.
  const joined = !(await db.meta.get('syncAt'))
  const incoming = remote && !joined ? incomingChanges(local, merged) : { words: 0, removed: 0, texts: 0, settings: 0 }
  // What another device's later edits replaced here is kept (a few copies) so it can be taken back.
  const replaced = remote && !joined ? replacedByRemote(local, merged) : []
  if (replaced.length) await db.meta.put({ key: REPLACED_KEY, value: { at: new Date().toISOString(), entries: replaced.slice(0, REPLACED_KEPT) } })

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
      const bytes = (await store.fetch(await mediaPart(mid)))?.bytes
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
      await store.put(await mediaPart(mid), new TextEncoder().encode(JSON.stringify({ kind: row.kind, type: blob.type, data: btoa(bin) })))
      unsent.delete(mid)
      sent++
    })
  }
  // Items that did not go up stay off the list, so other devices don't ask for what the server doesn't have.
  const mediaIds = [...localMedia].filter((m) => !m.startsWith('tts:') && !m.startsWith('aud:') && !unsent.has(m))
  // The parts that changed go up first; the core, which lists them, goes last and is the one that must still be as read.
  let biggest = 0
  for (const [name, shard] of shards) {
    if (shard.fp === manifest[name]) continue
    const was = pulled.get(name)
    biggest = Math.max(biggest, await store.put(name, shardFile(shard), was?.exists ? { ifMatch: was.etag } : { createOnly: true }))
  }
  const listed = Object.fromEntries([...shards].map(([name, shard]) => [name, shard.fp]))
  const coreBytes = await store.put('core', new TextEncoder().encode(JSON.stringify({ ...withoutShards(merged), shards: listed, mediaIds })), { ifMatch: fetched?.etag })
  await db.meta.put({ key: 'syncSize', value: Math.max(coreBytes, biggest) })
  await db.meta.put({ key: 'syncAt', value: new Date().toISOString() })
  return { received, sent, skipped, incoming, ...(replaced.length ? { replaced: replaced.map((v) => v.lemma) } : {}) }
}
