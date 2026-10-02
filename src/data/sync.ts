import { exportBackup, mediaBlob, parseBackup, restoreBackup, type Backup, type KelimeDB } from './db'

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

async function keyOf(code: string): Promise<CryptoKey> {
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
export async function seal(data: Bytes, code: string): Promise<Bytes> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const zipped = await pipe(data, new CompressionStream('gzip'))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyOf(code), zipped))
  const out = new Uint8Array(12 + ct.length)
  out.set(iv)
  out.set(ct, 12)
  return out
}

export async function open(sealed: Bytes, code: string): Promise<Bytes> {
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
 * each word keeps its most recently reviewed state, and words deleted on either side stay
 * deleted. Where one item differs on both sides, the newer snapshot wins.
 */
export function mergeBackups(local: Backup, remote: Backup): Backup {
  const [older, newer] = time(local.exportedAt) >= time(remote.exportedAt) ? [remote, local] : [local, remote]
  const deleted = new Set([...(local.deleted ?? []), ...(remote.deleted ?? [])])
  const alive = <T extends { entryId: string }>(xs: T[]) => xs.filter((x) => !deleted.has(x.entryId))
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
    vocabulary: unionBy(older.vocabulary, newer.vocabulary, (v) => v.id, (_, y) => y).filter((v) => !deleted.has(v.id)),
    wordStates: alive(
      unionBy(older.wordStates, newer.wordStates, (s) => s.entryId, (x, y) => (time(y.lastReviewAt) > time(x.lastReviewAt) || (time(y.lastReviewAt) === time(x.lastReviewAt) && y.stats.reviews >= x.stats.reviews) ? y : x)),
    ),
    events: alive(unionBy(older.events, newer.events, (e) => e.id)),
    mistakes: alive(unionBy(older.mistakes, newer.mistakes, (m) => m.id, (x, y) => (y.count > x.count || (y.count === x.count && time(y.lastAt) >= time(x.lastAt)) ? y : x))),
    stories: unionBy(older.stories, newer.stories, (s) => s.id, (x, y) => (y.completedAt || !x.completedAt ? y : x)),
    reading: {
      known,
      ignored,
      encounters,
      library: unionBy(older.reading?.library, newer.reading?.library, (t) => t.id, (x, y) => (y.history.length >= x.history.length ? y : x)),
    },
    vocabTests: unionBy(older.vocabTests, newer.vocabTests, (t) => `${t.language}|${t.at}`),
    journal: unionBy(older.journal, newer.journal, (j) => j.id, (x, y) => (y.review || !x.review ? y : x)),
    bossWins: unionBy(older.bossWins, newer.bossWins, (w) => `${w.entryId}|${w.at}`),
    missions: unionBy(older.missions, newer.missions, (m) => `${m.mission}|${m.at}`),
    exams: unionBy(older.exams, newer.exams, (e) => `${e.language}|${e.at}`),
    deleted: [...deleted],
    media: [],
  }
}

// ---------------------------------------------------------------------------
// Talking to the server
// ---------------------------------------------------------------------------

async function download(id: string, part: string, code: string): Promise<Bytes | null> {
  const res = await fetch(`/api/sync?id=${id}&part=${encodeURIComponent(part)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`sync ${res.status}`)
  return open(new Uint8Array(await res.arrayBuffer()), code)
}

async function upload(id: string, part: string, data: Bytes, code: string) {
  const res = await fetch(`/api/sync?id=${id}&part=${encodeURIComponent(part)}`, { method: 'PUT', body: await seal(data, code), headers: { 'content-type': 'application/octet-stream' } })
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
export async function syncNow(db: KelimeDB, code: string): Promise<SyncResult> {
  const id = await syncIdOf(code)
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
    if (remoteMedia.has(mid) || mid.startsWith('tts:')) continue
    const row = await db.media.get(mid)
    if (!row) continue
    const blob = mediaBlob(row)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    await upload(id, await mediaPart(mid), new TextEncoder().encode(JSON.stringify({ kind: row.kind, type: blob.type, data: btoa(bin) })), code)
    sent++
  }
  const mediaIds = [...localMedia].filter((m) => !m.startsWith('tts:'))
  await upload(id, 'core', new TextEncoder().encode(JSON.stringify({ ...merged, mediaIds })), code)
  await db.meta.put({ key: 'syncAt', value: new Date().toISOString() })
  return { received, sent }
}
