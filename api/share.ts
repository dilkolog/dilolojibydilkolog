import { del, get, list, put } from '@vercel/blob'
import { accountOf, requireApproved, StorageError } from './_account.js'
import { eq, rows, tablesOn, write } from './_tables.js'
import { fromApp } from './_origin.js'
import { overLimit, tooMany } from './_rate.js'
import { dailyQuotaReached, overDaily } from './_quota.js'

/**
 * Word lists shared by link. A set is a snapshot of a list's words (no progress): anyone with the link
 * may read it. A collaborative list is one the people with the link all edit. Only approved accounts
 * make, change or publish sets; reading one needs only its link (a random 32-hex id).
 *
 * POST   /api/share                      {kind: 'set' | 'collab', name, language, words, publish?, by?} → {id}
 * GET    /api/share?id=…                 → the set (a collaborative one carries its ETag)
 * PUT    /api/share?id=…                 {name?, words}, collaborative only, `If-Match` → 204 (412 when changed since)
 * DELETE /api/share?id=…                 the maker only
 * GET    /api/share?library=1[&language] → the published sets (approved accounts)
 *
 * Words are kept small and plain: the server checks the shape and the lengths, never trusts them.
 */
export const SHARE_ID = /^[0-9a-f]{32}$/
const ID = SHARE_ID
const LANGUAGES = ['en', 'fr', 'es']
export const MAX_WORDS = 500
const MAX_BODY = 400_000
const LIBRARY = 'share/library.json'
const LIBRARY_KEPT = 300

export interface SharedWord {
  /** Stable across devices (the word's id), so an edit and a deletion find their word. */
  key: string
  word: string
  meaning: string
  example?: string
  exampleTranslation?: string
  notes?: string
  /** When this version was written (ISO): the later one wins a merge. */
  at: string
  deleted?: true
}

export interface SharedDoc {
  v: 1
  kind: 'set' | 'collab'
  /** The account that made it (its id), for deleting. Never sent back. */
  owner: string
  name: string
  language: string
  words: SharedWord[]
  createdAt: string
  updatedAt: string
}

export interface LibraryItem {
  id: string
  name: string
  language: string
  count: number
  by?: string
  at: string
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } })

const text = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)

/** Names a publisher may not show in the public library: they would pass a stranger's list off as the site's own. */
const RESERVED_BY = /diloloji|admin|moderat|yönetici|yonetici|resmi|official|destek|support|kelime-?ko[cç]|monki/i

/** The publisher's name as the library shows it: plain text, no control or direction characters, never the site's name. */
export function cleanBy(v: unknown): string | undefined {
  const name = text(typeof v === 'string' ? v.replace(/[\p{Cc}\p{Cf}<>"“”]/gu, '') : v, 30)
  return name && !RESERVED_BY.test(name.normalize('NFKC')) ? name : undefined
}

/** The words as the server keeps them, or null when the shape is wrong. */
export function cleanWords(raw: unknown, now: string): SharedWord[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_WORDS) return null
  const out: SharedWord[] = []
  const seen = new Set<string>()
  for (const w of raw) {
    if (!w || typeof w !== 'object') return null
    const o = w as Record<string, unknown>
    const key = text(o.key, 80)
    const word = text(o.word, 80)
    if (!key || !word || seen.has(key)) return null
    seen.add(key)
    const at = typeof o.at === 'string' && !Number.isNaN(Date.parse(o.at)) ? new Date(o.at).toISOString() : now
    if (o.deleted === true) {
      out.push({ key, word, meaning: '', at, deleted: true })
      continue
    }
    const meaning = text(o.meaning, 160)
    if (!meaning) return null
    out.push({ key, word, meaning, ...opt('example', text(o.example, 300)), ...opt('exampleTranslation', text(o.exampleTranslation, 300)), ...opt('notes', text(o.notes, 300)), at })
  }
  return out
}
const opt = <K extends string>(key: K, value: string | undefined) => (value === undefined ? {} : ({ [key]: value } as Record<K, string>))

const newId = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')

/** Where shared lists are kept: Blob files, or (after the owner's move) the Supabase table shared_lists. */
export interface ShareStore {
  /** The list and a tag of its version (sent as the ETag, given back as If-Match). */
  get(id: string): Promise<{ doc: SharedDoc; etag?: string } | null>
  create(id: string, doc: SharedDoc, publish?: { by?: string }): Promise<void>
  /** 'changed': someone wrote since the version `ifMatch` names. */
  update(id: string, doc: SharedDoc, ifMatch?: string): Promise<'ok' | 'changed'>
  remove(id: string): Promise<void>
  /** Off the public library, the list itself kept (reported by several people: api/_reports.ts). */
  unpublish(id: string): Promise<void>
  library(language: string | null): Promise<LibraryItem[]>
}

export const shareStore = async (): Promise<ShareStore> => ((await tablesOn()) ? tableShares : blobShares)

async function readJson<T>(path: string): Promise<{ value: T; etag?: string } | null> {
  let blob
  try {
    blob = await get(path, { access: 'private', useCache: false })
  } catch {
    throw new StorageError('storage unavailable')
  }
  if (!blob || blob.statusCode !== 200 || !blob.stream) return null
  return { value: JSON.parse(await new Response(blob.stream).text()) as T, etag: blob.blob?.etag }
}

const writeJson = (path: string, value: unknown, ifMatch?: string) =>
  put(path, JSON.stringify(value), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', ...(ifMatch ? { ifMatch } : {}) })

const pathOf = (id: string) => `share/${id}.json`

async function addToLibrary(item: LibraryItem) {
  const cur = (await readJson<LibraryItem[]>(LIBRARY))?.value ?? []
  await writeJson(LIBRARY, [item, ...cur.filter((x) => x.id !== item.id)].slice(0, LIBRARY_KEPT))
}

async function removeFromLibrary(id: string) {
  const cur = (await readJson<LibraryItem[]>(LIBRARY))?.value
  if (cur?.some((x) => x.id === id)) await writeJson(LIBRARY, cur.filter((x) => x.id !== id))
}

/** share/<id>.json, one file a list; share/library.json, the published ones (newest first, LIBRARY_KEPT). */
export const blobShares: ShareStore = {
  async get(id) {
    const found = await readJson<SharedDoc>(pathOf(id))
    return found ? { doc: found.value, etag: found.etag } : null
  },
  async create(id, doc, publish) {
    await writeJson(pathOf(id), doc)
    if (publish) await addToLibrary({ id, name: doc.name, language: doc.language, count: doc.words.length, ...opt('by', publish.by), at: doc.createdAt })
  },
  async update(id, doc, ifMatch) {
    try {
      await writeJson(pathOf(id), doc, ifMatch)
    } catch (e) {
      if (ifMatch && (e as { name?: string })?.name === 'BlobPreconditionFailedError') return 'changed'
      throw e
    }
    return 'ok'
  },
  async remove(id) {
    await del(pathOf(id)).catch(() => {})
    await removeFromLibrary(id)
  },
  async unpublish(id) {
    await removeFromLibrary(id)
  },
  async library(language) {
    const all = (await readJson<LibraryItem[]>(LIBRARY))?.value ?? []
    return language ? all.filter((x) => x.language === language) : all
  },
}

/** Every shared list in Blob with its library entry, for the move to the tables. */
export async function blobSharesForMove(): Promise<{ id: string; doc: SharedDoc; published?: LibraryItem }[]> {
  const library = (await readJson<LibraryItem[]>(LIBRARY))?.value ?? []
  const out: { id: string; doc: SharedDoc; published?: LibraryItem }[] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix: 'share/', cursor })
    for (const b of page.blobs) {
      const id = /^share\/([0-9a-f]{32})\.json$/.exec(b.pathname)?.[1]
      const found = id ? await readJson<SharedDoc>(b.pathname).catch(() => null) : null
      if (id && found?.value?.words) out.push({ id, doc: found.value, published: library.find((x) => x.id === id) })
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return out
}

interface ShareRow {
  id: string
  kind: 'set' | 'collab'
  owner: string
  name: string
  language: string
  words: SharedWord[]
  word_count: number
  version: number
  published: boolean
  published_by: string | null
  created_at: string
  updated_at: string
}

/** A row as written for a list (the move passes `published` and its library entry's `by`). */
export const rowOfShare = (id: string, doc: SharedDoc, publish?: { by?: string }, version = 1) => ({
  id,
  kind: doc.kind,
  owner: doc.owner,
  name: doc.name,
  language: doc.language,
  words: doc.words,
  word_count: doc.words.filter((w) => !w.deleted).length,
  version,
  published: !!publish && doc.kind === 'set',
  published_by: publish?.by ?? null,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
})

const docOfRow = (r: ShareRow): SharedDoc => ({ v: 1, kind: r.kind, owner: r.owner, name: r.name, language: r.language, words: r.words ?? [], createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() })
const tagOf = (version: number) => `"v${version}"`
const versionOf = (tag: string | undefined) => Number(/^(?:W\/)?"v(\d+)"$/.exec(tag ?? '')?.[1] ?? NaN)

/** One row a list in shared_lists; `version` goes up with every write and is the ETag. */
export const tableShares: ShareStore = {
  async get(id) {
    const [row] = await rows<ShareRow>(`shared_lists?id=${eq(id)}&select=*`)
    return row ? { doc: docOfRow(row), etag: tagOf(row.version) } : null
  },
  async create(id, doc, publish) {
    await write('shared_lists', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify(rowOfShare(id, doc, publish)) })
  },
  async update(id, doc, ifMatch) {
    const [row] = await rows<{ version: number }>(`shared_lists?id=${eq(id)}&select=version`)
    if (!row) return 'changed'
    // An If-Match from before the move (a Blob tag) names no version here: the app reads again and merges.
    const expect = ifMatch === undefined ? row.version : versionOf(ifMatch)
    if (!Number.isFinite(expect)) return 'changed'
    const res = await write(`shared_lists?id=${eq(id)}&version=eq.${expect}`, {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ name: doc.name, words: doc.words, word_count: doc.words.filter((w) => !w.deleted).length, version: expect + 1, updated_at: doc.updatedAt }),
    })
    return ((await res.json()) as unknown[]).length ? 'ok' : 'changed'
  },
  async remove(id) {
    await write(`shared_lists?id=${eq(id)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  },
  async unpublish(id) {
    await write(`shared_lists?id=${eq(id)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ published: false }) })
  },
  async library(language) {
    const filter = language ? `&language=${eq(language)}` : ''
    const found = await rows<Pick<ShareRow, 'id' | 'name' | 'language' | 'word_count' | 'published_by' | 'created_at'>>(
      `shared_lists?published=eq.true${filter}&select=id,name,language,word_count,published_by,created_at&order=created_at.desc&limit=${LIBRARY_KEPT}`,
    )
    return found.map((r) => ({ id: r.id, name: r.name, language: r.language, count: r.word_count, ...opt('by', r.published_by ?? undefined), at: new Date(r.created_at).toISOString() }))
  },
}

async function guard<T>(run: () => Promise<T>): Promise<T | Response> {
  try {
    return await run()
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

export async function GET(request: Request): Promise<Response> {
  return (await guard(() => handleGet(request))) as Response
}

async function handleGet(request: Request): Promise<Response> {
  if (overLimit(request, 'share-read', 120)) return tooMany()
  const q = new URL(request.url).searchParams
  if (q.get('library')) {
    if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
    const denied = await requireApproved(request)
    if (denied) return denied
    return json({ items: await (await shareStore()).library(q.get('language')) })
  }
  const id = q.get('id') ?? ''
  if (!ID.test(id)) return json({ error: 'bad id' }, 400)
  const found = await (await shareStore()).get(id)
  if (!found) return json({ error: 'not found' }, 404)
  const { owner: _owner, ...doc } = found.doc
  // A snapshot never changes, so it may be cached; a collaborative list is read fresh every time.
  return json(doc, 200, doc.kind === 'set' ? { 'cache-control': 'public, max-age=300' } : found.etag ? { etag: found.etag } : {})
}

export async function POST(request: Request): Promise<Response> {
  return (await guard(() => handlePost(request))) as Response
}

async function handlePost(request: Request): Promise<Response> {
  if (overLimit(request, 'share-write', 30)) return tooMany()
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const denied = await requireApproved(request)
  if (denied) return denied
  // A new share is a new stored file: a day's allowance per account, so nobody fills the store or floods the library.
  if (await overDaily(request, 'share')) return dailyQuotaReached()
  const raw = await request.text()
  if (raw.length > MAX_BODY) return json({ error: 'too large' }, 413)
  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'bad request' }, 400)
  }
  const now = new Date().toISOString()
  const name = text(body.name, 60)
  const words = cleanWords(body.words, now)
  const kind = body.kind === 'collab' ? 'collab' : body.kind === 'set' ? 'set' : null
  if (!name || !words || !kind || !LANGUAGES.includes(body.language as string) || words.filter((w) => !w.deleted).length === 0) return json({ error: 'bad request' }, 400)
  const owner = (await accountOf(request)) ?? ''
  const id = newId()
  const doc: SharedDoc = { v: 1, kind, owner, name, language: body.language as string, words, createdAt: now, updatedAt: now }
  // Only snapshots are published: a library entry that others can change would be a different thing on each look.
  await (await shareStore()).create(id, doc, body.publish === true && kind === 'set' ? { by: cleanBy(body.by) } : undefined)
  return json({ id }, 201)
}

export async function PUT(request: Request): Promise<Response> {
  return (await guard(() => handlePut(request))) as Response
}

async function handlePut(request: Request): Promise<Response> {
  if (overLimit(request, 'share-write', 30)) return tooMany()
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const denied = await requireApproved(request)
  if (denied) return denied
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!ID.test(id)) return json({ error: 'bad id' }, 400)
  const raw = await request.text()
  if (raw.length > MAX_BODY) return json({ error: 'too large' }, 413)
  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'bad request' }, 400)
  }
  const store = await shareStore()
  const found = await store.get(id)
  if (!found) return json({ error: 'not found' }, 404)
  if (found.doc.kind !== 'collab') return json({ error: 'read only' }, 405)
  const now = new Date().toISOString()
  const words = cleanWords(body.words, now)
  if (!words) return json({ error: 'bad request' }, 400)
  const ifMatch = request.headers.get('if-match') ?? undefined
  if ((await store.update(id, { ...found.doc, name: text(body.name, 60) ?? found.doc.name, words, updatedAt: now }, ifMatch)) === 'changed') return json({ error: 'changed' }, 412)
  return new Response(null, { status: 204 })
}

export async function DELETE(request: Request): Promise<Response> {
  return (await guard(() => handleDelete(request))) as Response
}

async function handleDelete(request: Request): Promise<Response> {
  if (overLimit(request, 'share-write', 30)) return tooMany()
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const denied = await requireApproved(request)
  if (denied) return denied
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!ID.test(id)) return json({ error: 'bad id' }, 400)
  const store = await shareStore()
  const found = await store.get(id)
  if (!found) return json({ error: 'not found' }, 404)
  const me = await accountOf(request)
  if (!found.doc.owner || found.doc.owner !== me) return json({ error: 'not yours' }, 403)
  await store.remove(id)
  return new Response(null, { status: 204 })
}
