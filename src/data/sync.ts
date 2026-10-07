import { mergeSeen, type LabData } from '../engine/labProgress'
import { mergeNotes } from '../engine/dictionaryNotes'
import { exportBackup, mediaBlob, parseBackup, restoreBackup, type Backup, type KelimeDB } from './db'
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
  return {
    favorites: [...new Set([...newer.favorites, ...older.favorites])],
    recent: [...new Set([...newer.recent, ...older.recent])].slice(0, 12),
    records,
    tally,
    kinds: most(older.kinds as Record<string, number>, newer.kinds as Record<string, number>),
    seen: Object.fromEntries([...new Set([...Object.keys(older.seen ?? {}), ...Object.keys(newer.seen ?? {})])].map((v) => [v, mergeSeen(older.seen?.[v], newer.seen?.[v])])),
  }
}

export function mergeBackups(local: Backup, remote: Backup): Backup {
  const [older, newer] = time(local.exportedAt) >= time(remote.exportedAt) ? [remote, local] : [local, remote]
  const tombs = mergeTombs(tombMap(local.deleted, time(local.exportedAt)), tombMap(remote.deleted, time(remote.exportedAt)))
  const dead = (id: string, createdAt?: Date | string) => isDead(tombs, id, createdAt)
  const known: NonNullable<Backup['reading']>['known'] = {}
  for (const r of [older.reading, newer.reading]) for (const [l, keys] of Object.entries(r?.known ?? {})) known[l as keyof typeof known] = [...new Set([...(known[l as keyof typeof known] ?? []), ...(keys ?? [])])]
  const ignored: NonNullable<NonNullable<Backup['reading']>['ignored']> = {}
  for (const r of [older.reading, newer.reading]) for (const [l, keys] of Object.entries(r?.ignored ?? {})) ignored[l as keyof typeof ignored] = [...new Set([...(ignored[l as keyof typeof ignored] ?? []), ...(keys ?? [])])]
  const encounters: Record<string, number> = { ...(older.reading?.encounters ?? {}) }
  for (const [id, n] of Object.entries(newer.reading?.encounters ?? {})) encounters[id] = Math.max(encounters[id] ?? 0, n)

  return {
    app: 'kelime-koc',
    version: Math.max(local.version, remote.version),
    exportedAt: new Date().toISOString(),
    settings: newer.settings ?? older.settings,
    vocabulary: unionBy(older.vocabulary, newer.vocabulary, (v) => v.id, (_, y) => y).filter((v) => !dead(v.id, v.addedAt)),
    wordStates: unionBy(older.wordStates, newer.wordStates, (s) => s.entryId, (x, y) => (time(y.lastReviewAt) > time(x.lastReviewAt) || (time(y.lastReviewAt) === time(x.lastReviewAt) && y.stats.reviews >= x.stats.reviews) ? y : x)).filter(
      (s) => !dead(s.entryId, s.introducedAt),
    ),
    events: unionBy(older.events, newer.events, (e) => e.id).filter((e) => !dead(e.entryId, e.timestamp)),
    mistakes: unionBy(older.mistakes, newer.mistakes, (m) => m.id, (x, y) => (y.count > x.count || (y.count === x.count && time(y.lastAt) >= time(x.lastAt)) ? y : x)).filter(
      (m) => !dead(m.entryId, m.lastAt),
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
    lab: { fr: mergeLab(older.lab?.fr, newer.lab?.fr), es: mergeLab(older.lab?.es, newer.lab?.es) },
    dictionary: { en: mergeNotes(older.dictionary?.en, newer.dictionary?.en), fr: mergeNotes(older.dictionary?.fr, newer.dictionary?.fr), es: mergeNotes(older.dictionary?.es, newer.dictionary?.es) },
    records: Object.fromEntries([...new Set([...Object.keys(older.records ?? {}), ...Object.keys(newer.records ?? {})])].map((k) => [k, Math.max(older.records?.[k] ?? 0, newer.records?.[k] ?? 0)])),
    media: [],
  }
}

// ---------------------------------------------------------------------------
// Talking to the server
// ---------------------------------------------------------------------------

async function download(id: string, part: string, code: Credential): Promise<Bytes | null> {
  const res = await fetch(`/api/sync?id=${id}&part=${encodeURIComponent(part)}`, { headers: authHeaders(code) })
  if (res.status === 404) return null
  if (res.status === 403) throw await refusal(res)
  if (!res.ok) throw new Error(`sync ${res.status}`)
  return open(new Uint8Array(await res.arrayBuffer()), code)
}

async function upload(id: string, part: string, data: Bytes, code: Credential) {
  const res = await fetch(`/api/sync?id=${id}&part=${encodeURIComponent(part)}`, { method: 'PUT', body: await seal(data, code), headers: { 'content-type': 'application/octet-stream', ...authHeaders(code) } })
  if (res.status === 403) throw await refusal(res)
  if (!res.ok) throw new Error(`sync ${res.status}`)
}

/** Media ids become file names on the server; hashing keeps them to a safe alphabet. */
async function mediaPart(mediaId: string): Promise<string> {
  return `m-${hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(mediaId))).slice(0, 40)}`
}

export interface SyncResult {
  /** Media items fetched from / sent to the other devices. */
  received: number
  sent: number
}

/**
 * Pull, merge, write locally, push. Safe to run any time: running it twice in a row changes
 * nothing the second time.
 */
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
  const id = await credentialId(code)
  const local = parseBackup(await exportBackup(db, new Date(), { media: false }))
  // A device joining an existing sync takes the others' settings and edits rather than its own defaults.
  if (!(await db.meta.get('syncAt'))) local.exportedAt = new Date(0).toISOString()
  const remoteBytes = await download(id, 'core', code)
  const remote = remoteBytes ? parseBackup(new TextDecoder().decode(remoteBytes)) : null
  const merged = remote ? mergeBackups(local, remote) : local
  if (remote) await restoreBackup(db, merged, { keepMedia: true })

  // Media: the remote list says which pictures/recordings exist elsewhere.
  const localMedia = new Set((await db.media.toCollection().primaryKeys()) as string[])
  const remoteMedia = new Set((remote as (Backup & { mediaIds?: string[] }) | null)?.mediaIds ?? [])
  let received = 0
  for (const mid of remoteMedia) {
    if (localMedia.has(mid)) continue
    const bytes = await download(id, await mediaPart(mid), code)
    if (!bytes) continue
    const { kind, type, data } = JSON.parse(new TextDecoder().decode(bytes)) as { kind: 'image' | 'audio'; type: string; data: string }
    const raw = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
    await db.media.put({ id: mid, kind, type, data: raw.buffer, createdAt: new Date() })
    localMedia.add(mid)
    received++
  }
  let sent = 0
  for (const mid of localMedia) {
    if (remoteMedia.has(mid) || mid.startsWith('tts:') || mid.startsWith('aud:')) continue
    const row = await db.media.get(mid)
    if (!row) continue
    const blob = mediaBlob(row)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    await upload(id, await mediaPart(mid), new TextEncoder().encode(JSON.stringify({ kind: row.kind, type: blob.type, data: btoa(bin) })), code)
    sent++
  }
  const mediaIds = [...localMedia].filter((m) => !m.startsWith('tts:') && !m.startsWith('aud:'))
  await upload(id, 'core', new TextEncoder().encode(JSON.stringify({ ...merged, mediaIds })), code)
  await db.meta.put({ key: 'syncAt', value: new Date().toISOString() })
  return { received, sent }
}
