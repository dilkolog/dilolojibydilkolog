import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// R2, listed by prefix a page at a time (as the move reads it).
const blobs = new Map<string, string>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: string, opts: { allowOverwrite?: boolean }) => {
    if (opts.allowOverwrite === false && blobs.has(path)) throw new Error('exists')
    blobs.set(path, body)
    return {}
  },
  get: async (path: string) => (blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)).body, blob: { etag: 'e' } } : null),
  list: async ({ prefix, cursor, limit = 1000 }: { prefix: string; cursor?: string; limit?: number }) => {
    const all = [...blobs.keys()].filter((k) => k.startsWith(prefix)).sort()
    const start = cursor ? Number(cursor) : 0
    const page = all.slice(start, start + limit)
    const more = start + limit < all.length
    return { blobs: page.map((pathname) => ({ pathname })), hasMore: more, cursor: more ? String(start + limit) : undefined }
  },
  del: async (path: string | string[]) => void (Array.isArray(path) ? path : [path]).forEach((p) => blobs.delete(p)),
}))

const { readText, writeJson, removeBlob, createText } = await import('../../api/_account')
const docs = await import('../../api/_docs')
const { isOwnerSession } = await import('../../api/_owner')
const admin = await import('../../api/admin')

const SB = 'https://proj.supabase.co'
/** server_docs and server_flags, and who a bearer token is. */
const table = new Map<string, string>()
const flags = new Set<string>()
const USERS: Record<string, { id: string; email: string; email_confirmed_at: string | null }> = {
  'tok-owner': { id: '11111111-1111-1111-1111-111111111111', email: 'Sahip@Example.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
  'tok-unconfirmed': { id: '22222222-2222-2222-2222-222222222222', email: 'sahip@example.com', email_confirmed_at: null },
  'tok-other': { id: '33333333-3333-3333-3333-333333333333', email: 'biri@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
}

function fakeSupabase(input: string, init: RequestInit = {}): Response {
  const url = new URL(input)
  if (url.pathname === '/auth/v1/user') {
    const user = USERS[new Headers(init.headers).get('authorization')?.replace('Bearer ', '') ?? '']
    return user ? Response.json(user) : Response.json({}, { status: 401 })
  }
  const name = url.pathname.replace('/rest/v1/', '')
  if (name === 'server_flags') {
    if (init.method === 'POST') flags.add((JSON.parse(String(init.body)) as { name: string }).name)
    const wanted = url.searchParams.get('name')?.replace('eq.', '')
    return Response.json(wanted && flags.has(wanted) ? [{ name: wanted }] : [])
  }
  if (name !== 'server_docs') return new Response('not found', { status: 404 })
  const path = url.searchParams.get('path')
  if (init.method === 'POST') {
    const rows = [JSON.parse(String(init.body))].flat() as { path: string; body: string }[]
    const ignore = new Headers(init.headers).get('prefer')?.includes('ignore-duplicates')
    const written = rows.filter((r) => !(ignore && table.has(r.path)))
    for (const r of written) table.set(r.path, r.body)
    return Response.json(written)
  }
  if (init.method === 'DELETE') {
    table.delete(path!.replace('eq.', ''))
    return new Response(null, { status: 204 })
  }
  if (path?.startsWith('like.')) {
    const prefix = path.slice(5, -1).replace(/\\(.)/g, '$1')
    return Response.json([...table.keys()].filter((p) => p.startsWith(prefix)).sort().map((p) => ({ path: p })))
  }
  if (path?.startsWith('eq.')) {
    const body = table.get(path.slice(3))
    return Response.json(body === undefined ? [] : [{ body }])
  }
  return Response.json([...table.keys()].slice(0, 1).map((p) => ({ path: p })))
}

const ID = 'a'.repeat(64)

beforeEach(() => {
  blobs.clear()
  table.clear()
  flags.clear()
  docs.resetDocs()
  vi.stubEnv('SUPABASE_URL', SB)
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
  vi.stubEnv('OWNER_EMAIL', 'sahip@example.com')
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => fakeSupabase(String(input), init))
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('small server documents in Supabase (migration 0010)', () => {
  it('a document path is written to the table and read from it; other paths stay in R2', async () => {
    await writeJson(`friends/handle-of/${ID}.json`, { handle: 'ali', findable: true })
    expect(table.get(`friends/handle-of/${ID}.json`)).toBe('{"handle":"ali","findable":true}')
    expect(blobs.has(`friends/handle-of/${ID}.json`)).toBe(false)
    expect(await readText(`friends/handle-of/${ID}.json`)).toBe('{"handle":"ali","findable":true}')
    await writeJson('share/x.json', { a: 1 })
    expect(blobs.has('share/x.json')).toBe(true)
    expect(table.has('share/x.json')).toBe(false)
  })

  it('an old R2 file is not read once Supabase is set up; without Supabase the files are used', async () => {
    blobs.set(`sync/${ID}/auth.txt`, 'hash')
    expect(await readText(`sync/${ID}/auth.txt`)).toBeNull()
    vi.stubEnv('SUPABASE_URL', '')
    expect(await readText(`sync/${ID}/auth.txt`)).toBe('hash')
    await writeJson(`friends/requested/${ID}.json`, { X: 'now' })
    expect(blobs.get(`friends/requested/${ID}.json`)).toBe('{"X":"now"}')
    expect(await docs.listDocPaths('friends/requested/')).toEqual([`friends/requested/${ID}.json`])
  })

  it('Supabase unreachable: a storage failure, never a silent fall back to the old files', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('down')
    })
    await expect(writeJson(`friends/requested/${ID}.json`, { X: 'now' })).rejects.toThrow('storage unavailable')
    await expect(readText(`friends/requested/${ID}.json`)).rejects.toThrow('storage unavailable')
    expect(blobs.has(`friends/requested/${ID}.json`)).toBe(false)
  })

  it('deleting takes the R2 copy the move left behind too, so a deleted account leaves nothing there', async () => {
    blobs.set('friends/blocked/x.json', '{"codes":[]}')
    table.set('friends/blocked/x.json', '{"codes":["ABCDEFGH"]}')
    await removeBlob('friends/blocked/x.json', true)
    expect(blobs.has('friends/blocked/x.json')).toBe(false)
    expect(table.has('friends/blocked/x.json')).toBe(false)
    expect(await readText('friends/blocked/x.json')).toBeNull()
  })

  it('a name is created once: a name held in the table is not free', async () => {
    table.set('friends/handle/eski.json', '{"id":"b"}')
    expect(await createText('friends/handle/eski.json', '{"id":"c"}')).toBe(false)
    expect(await createText('friends/handle/yeni.json', `{"id":"${ID}"}`)).toBe(true)
    expect(await createText('friends/handle/yeni.json', '{"id":"c"}')).toBe(false)
    expect(table.get('friends/handle/yeni.json')).toBe(`{"id":"${ID}"}`)
  })

})

describe('the owner signed in', () => {
  const req = (token?: string) => new Request('https://app.test/api/admin', { headers: token ? { authorization: `Bearer ${token}` } : {} })

  it('is the confirmed OWNER_EMAIL only (capitals aside)', async () => {
    expect(await isOwnerSession(req('tok-owner'))).toBe(true)
    expect(await isOwnerSession(req('tok-unconfirmed'))).toBe(false)
    expect(await isOwnerSession(req('tok-other'))).toBe(false)
    expect(await isOwnerSession(req())).toBe(false)
    vi.stubEnv('OWNER_EMAIL', '')
    expect(await isOwnerSession(req('tok-owner'))).toBe(false)
  })

  it('is the only way into the admin endpoint', async () => {
    expect((await admin.GET(new Request('https://app.test/api/admin?view=me', { headers: { authorization: 'Bearer tok-other' } }))).status).toBe(403)
    expect((await admin.GET(new Request('https://app.test/api/admin?view=me', { headers: { authorization: 'Bearer tok-owner' } }))).status).toBe(200)
  })
})
