import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

// An in-memory Blob store with ETags and If-Match, behind the real /api/share handlers.
const blobs = new Map<string, { bytes: Uint8Array; etag: string }>()
let version = 0
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: ArrayBuffer | string, opts: { allowOverwrite?: boolean; ifMatch?: string }) => {
    const cur = blobs.get(path)
    if (opts.allowOverwrite === false && cur) throw new Error('exists')
    if (opts.ifMatch && cur && cur.etag !== opts.ifMatch) throw Object.assign(new Error('precondition'), { name: 'BlobPreconditionFailedError' })
    blobs.set(path, { bytes: typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body), etag: `"v${++version}"` })
    return {}
  },
  get: async (path: string) => {
    const b = blobs.get(path)
    return b ? { statusCode: 200, stream: new Response(b.bytes.slice()).body, blob: { etag: b.etag } } : null
  },
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })) }),
  del: async (path: string) => void blobs.delete(path),
}))

const share = await import('../../api/share')
const { clearAccessCache } = await import('../../api/_account')

const ALI = 'a'.repeat(64)
const ALI_TOKEN = '1'.repeat(64)
const VELI = 'b'.repeat(64)
const VELI_TOKEN = '2'.repeat(64)
const STRANGER = 'c'.repeat(64)
const APP = { 'sec-fetch-site': 'same-origin' }
const as = (id: string, token: string) => ({ ...APP, 'x-sync-id': id, 'x-sync-auth': token })

// The stored hash is sha256 hex of the token, computed as the server does.
const claim = (id: string, token: string) => void blobs.set(`sync/${id}/auth.txt`, { bytes: new TextEncoder().encode(hashHex(token)), etag: 'a' })
let hashes = new Map<string, string>()
const hashHex = (t: string) => hashes.get(t) ?? ''
async function prepare() {
  for (const t of [ALI_TOKEN, VELI_TOKEN]) hashes.set(t, [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join(''))
}
const approve = (id: string) => void blobs.set(`access/approved/${id}.json`, { bytes: new TextEncoder().encode('{}'), etag: 'p' })

const words = [
  { key: 'fr:maison', word: 'la maison', meaning: 'ev', example: 'La maison est grande.', at: '2026-10-12T10:00:00Z' },
  { key: 'fr:chat', word: 'le chat', meaning: 'kedi', at: '2026-10-12T10:00:00Z' },
]
const post = (headers: Record<string, string>, body: unknown) => share.POST(new Request('https://app.test/api/share', { method: 'POST', headers, body: JSON.stringify(body) }))
const getId = (id: string, headers: Record<string, string> = {}) => share.GET(new Request(`https://app.test/api/share?id=${id}`, { headers }))
const put = (id: string, headers: Record<string, string>, body: unknown, ifMatch?: string) =>
  share.PUT(new Request(`https://app.test/api/share?id=${id}`, { method: 'PUT', headers: { ...headers, ...(ifMatch ? { 'if-match': ifMatch } : {}) }, body: JSON.stringify(body) }))
const del = (id: string, headers: Record<string, string>) => share.DELETE(new Request(`https://app.test/api/share?id=${id}`, { method: 'DELETE', headers }))
const library = (headers: Record<string, string>, language?: string) => share.GET(new Request(`https://app.test/api/share?library=1${language ? `&language=${language}` : ''}`, { headers }))

beforeEach(async () => {
  blobs.clear()
  clearAccessCache()
  hashes = new Map()
  await prepare()
  vi.stubEnv('ADMIN_TOKEN', 'owner-secret')
  claim(ALI, ALI_TOKEN)
  claim(VELI, VELI_TOKEN)
  approve(ALI)
  approve(VELI)
})
afterEach(() => vi.unstubAllEnvs())

describe('/api/share: sets by link', () => {
  it('an approved account makes a set; anyone with the link reads it, without the maker\'s id', async () => {
    const res = await post(as(ALI, ALI_TOKEN), { kind: 'set', name: 'Ev', language: 'fr', words })
    expect(res.status).toBe(201)
    const { id } = (await res.json()) as { id: string }
    expect(id).toMatch(/^[0-9a-f]{32}$/)
    const read = await getId(id)
    expect(read.status).toBe(200)
    expect(read.headers.get('cache-control')).toContain('max-age=300')
    const doc = await read.json()
    expect(doc).toMatchObject({ kind: 'set', name: 'Ev', language: 'fr' })
    expect(doc.words.map((w: { key: string }) => w.key)).toEqual(['fr:maison', 'fr:chat'])
    expect(JSON.stringify(doc)).not.toContain(ALI)
  })

  it('an account that is not approved, or no account, cannot make one', async () => {
    approve(STRANGER)
    blobs.delete(`access/approved/${STRANGER}.json`)
    expect((await post(as(STRANGER, '3'.repeat(64)), { kind: 'set', name: 'x', language: 'fr', words })).status).toBe(403)
    expect((await post(APP, { kind: 'set', name: 'x', language: 'fr', words })).status).toBe(403)
    expect((await post({}, { kind: 'set', name: 'x', language: 'fr', words })).status).toBe(403)
  })

  it('refuses a bad shape: no name, a wrong language, nothing to share, a word without a meaning, too many, a duplicate key', async () => {
    const bad = async (over: object) => (await post(as(ALI, ALI_TOKEN), { kind: 'set', name: 'Ev', language: 'fr', words, ...over })).status
    expect(await bad({ name: '  ' })).toBe(400)
    expect(await bad({ language: 'de' })).toBe(400)
    expect(await bad({ words: [] })).toBe(400)
    expect(await bad({ words: [{ key: 'a', word: 'x', meaning: '', at: '2026-10-12T10:00:00Z' }] })).toBe(400)
    expect(await bad({ words: Array.from({ length: share.MAX_WORDS + 1 }, (_, i) => ({ key: `k${i}`, word: 'w', meaning: 'm' })) })).toBe(400)
    expect(await bad({ words: [words[0], words[0]] })).toBe(400)
    expect(await bad({ kind: 'nope' })).toBe(400)
  })

  it('keeps fields short and plain', () => {
    const [w] = share.cleanWords([{ key: 'k', word: 'x'.repeat(500), meaning: 'm', example: 5, notes: 'n'.repeat(900), at: 'not a date' }], '2026-10-12T10:00:00.000Z')!
    expect(w.word).toHaveLength(80)
    expect(w.example).toBeUndefined()
    expect(w.notes).toHaveLength(300)
    expect(w.at).toBe('2026-10-12T10:00:00.000Z')
  })

  it('an unknown or malformed id is 404 or 400', async () => {
    expect((await getId('f'.repeat(32))).status).toBe(404)
    expect((await getId('nope')).status).toBe(400)
  })
})

describe('/api/share: the library', () => {
  it('a published set is listed for approved accounts (by language), newest first; a collaborative one is never published', async () => {
    await post(as(ALI, ALI_TOKEN), { kind: 'set', name: 'Ev', language: 'fr', words, publish: true, by: 'ali' })
    await post(as(ALI, ALI_TOKEN), { kind: 'set', name: 'Casa', language: 'es', words, publish: true })
    await post(as(ALI, ALI_TOKEN), { kind: 'collab', name: 'Ortak', language: 'fr', words, publish: true })
    await post(as(ALI, ALI_TOKEN), { kind: 'set', name: 'Gizli', language: 'fr', words })
    const all = (await (await library(as(VELI, VELI_TOKEN))).json()) as { items: { name: string; by?: string; count: number }[] }
    expect(all.items.map((i) => i.name)).toEqual(['Casa', 'Ev'])
    expect(all.items[1]).toMatchObject({ by: 'ali', count: 2 })
    const fr = (await (await library(as(VELI, VELI_TOKEN), 'fr')).json()) as { items: { name: string }[] }
    expect(fr.items.map((i) => i.name)).toEqual(['Ev'])
    expect((await library(APP)).status).toBe(403)
  })

  it('deleting a set takes it out of the library; only its maker may', async () => {
    const { id } = (await (await post(as(ALI, ALI_TOKEN), { kind: 'set', name: 'Ev', language: 'fr', words, publish: true })).json()) as { id: string }
    expect((await del(id, as(VELI, VELI_TOKEN))).status).toBe(403)
    expect((await del(id, as(ALI, ALI_TOKEN))).status).toBe(204)
    expect((await getId(id)).status).toBe(404)
    expect(((await (await library(as(VELI, VELI_TOKEN))).json()) as { items: unknown[] }).items).toEqual([])
  })
})

describe('/api/share: collaborative lists', () => {
  it('anyone approved with the link can change it; a change made meanwhile is a 412, not an overwrite', async () => {
    const { id } = (await (await post(as(ALI, ALI_TOKEN), { kind: 'collab', name: 'Ortak', language: 'fr', words })).json()) as { id: string }
    const first = await getId(id)
    const etag = first.headers.get('etag')!
    expect(etag).toBeTruthy()
    expect(first.headers.get('cache-control')).toBe('no-store')
    const more = [...words, { key: 'fr:eau', word: "l'eau", meaning: 'su', at: '2026-10-12T11:00:00Z' }]
    expect((await put(id, as(VELI, VELI_TOKEN), { words: more }, etag)).status).toBe(204)
    // Ali still holds the old ETag.
    expect((await put(id, as(ALI, ALI_TOKEN), { words: [words[0]] }, etag)).status).toBe(412)
    const now = (await (await getId(id)).json()) as { words: unknown[] }
    expect(now.words).toHaveLength(3)
  })

  it('a snapshot cannot be changed through PUT, and a stranger without approval cannot change anything', async () => {
    const set = (await (await post(as(ALI, ALI_TOKEN), { kind: 'set', name: 'Ev', language: 'fr', words })).json()) as { id: string }
    expect((await put(set.id, as(ALI, ALI_TOKEN), { words })).status).toBe(405)
    const collab = (await (await post(as(ALI, ALI_TOKEN), { kind: 'collab', name: 'Ortak', language: 'fr', words })).json()) as { id: string }
    expect((await put(collab.id, APP, { words })).status).toBe(403)
  })

  it('keeps deletions as marks so another copy learns of them', async () => {
    const { id } = (await (await post(as(ALI, ALI_TOKEN), { kind: 'collab', name: 'Ortak', language: 'fr', words })).json()) as { id: string }
    await put(id, as(ALI, ALI_TOKEN), { words: [{ key: 'fr:chat', word: 'le chat', meaning: '', at: '2026-10-12T12:00:00Z', deleted: true }, words[0]] })
    const doc = (await (await getId(id)).json()) as { words: { key: string; deleted?: boolean }[] }
    expect(doc.words.find((w) => w.key === 'fr:chat')?.deleted).toBe(true)
  })
})
