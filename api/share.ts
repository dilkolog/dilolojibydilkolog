import { del, get, put } from '@vercel/blob'
import { accountOf, requireApproved } from './_account.js'
import { fromApp } from './_origin.js'

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
const ID = /^[0-9a-f]{32}$/
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

class StorageError extends Error {}

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

const newId = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')
const pathOf = (id: string) => `share/${id}.json`

async function addToLibrary(item: LibraryItem) {
  const cur = (await readJson<LibraryItem[]>(LIBRARY))?.value ?? []
  await writeJson(LIBRARY, [item, ...cur.filter((x) => x.id !== item.id)].slice(0, LIBRARY_KEPT))
}

async function removeFromLibrary(id: string) {
  const cur = (await readJson<LibraryItem[]>(LIBRARY))?.value
  if (cur?.some((x) => x.id === id)) await writeJson(LIBRARY, cur.filter((x) => x.id !== id))
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
  const q = new URL(request.url).searchParams
  if (q.get('library')) {
    if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
    const denied = await requireApproved(request)
    if (denied) return denied
    const language = q.get('language')
    const all = (await readJson<LibraryItem[]>(LIBRARY))?.value ?? []
    return json({ items: language ? all.filter((x) => x.language === language) : all })
  }
  const id = q.get('id') ?? ''
  if (!ID.test(id)) return json({ error: 'bad id' }, 400)
  const found = await readJson<SharedDoc>(pathOf(id))
  if (!found) return json({ error: 'not found' }, 404)
  const { owner: _owner, ...doc } = found.value
  // A snapshot never changes, so it may be cached; a collaborative list is read fresh every time.
  return json(doc, 200, doc.kind === 'set' ? { 'cache-control': 'public, max-age=300' } : found.etag ? { etag: found.etag } : {})
}

export async function POST(request: Request): Promise<Response> {
  return (await guard(() => handlePost(request))) as Response
}

async function handlePost(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const denied = await requireApproved(request)
  if (denied) return denied
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
  await writeJson(pathOf(id), doc)
  // Only snapshots are published: a library entry that others can change would be a different thing on each look.
  if (body.publish === true && kind === 'set') await addToLibrary({ id, name, language: doc.language, count: words.length, ...opt('by', text(body.by, 30)), at: now })
  return json({ id }, 201)
}

export async function PUT(request: Request): Promise<Response> {
  return (await guard(() => handlePut(request))) as Response
}

async function handlePut(request: Request): Promise<Response> {
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
  const found = await readJson<SharedDoc>(pathOf(id))
  if (!found) return json({ error: 'not found' }, 404)
  if (found.value.kind !== 'collab') return json({ error: 'read only' }, 405)
  const now = new Date().toISOString()
  const words = cleanWords(body.words, now)
  if (!words) return json({ error: 'bad request' }, 400)
  const ifMatch = request.headers.get('if-match') ?? undefined
  try {
    await writeJson(pathOf(id), { ...found.value, name: text(body.name, 60) ?? found.value.name, words, updatedAt: now }, ifMatch)
  } catch (e) {
    if (ifMatch && (e as { name?: string })?.name === 'BlobPreconditionFailedError') return json({ error: 'changed' }, 412)
    throw e
  }
  return new Response(null, { status: 204 })
}

export async function DELETE(request: Request): Promise<Response> {
  return (await guard(() => handleDelete(request))) as Response
}

async function handleDelete(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const denied = await requireApproved(request)
  if (denied) return denied
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!ID.test(id)) return json({ error: 'bad id' }, 400)
  const found = await readJson<SharedDoc>(pathOf(id))
  if (!found) return json({ error: 'not found' }, 404)
  const me = await accountOf(request)
  if (!found.value.owner || found.value.owner !== me) return json({ error: 'not yours' }, 403)
  await del(pathOf(id)).catch(() => {})
  await removeFromLibrary(id)
  return new Response(null, { status: 204 })
}
