import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// An in-memory Blob store behind the real handlers.
const blobs = new Map<string, Uint8Array>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: ArrayBuffer | string, opts: { allowOverwrite?: boolean }) => {
    if (opts.allowOverwrite === false && blobs.has(path)) throw new Error('exists')
    blobs.set(path, typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body))
    return {}
  },
  get: async (path: string) => (blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)!.slice()).body } : null),
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })) }),
  del: async (path: string) => void blobs.delete(path),
}))

const access = await import('../../api/access')
const admin = await import('../../api/admin')
const sync = await import('../../api/sync')
const translate = await import('../../api/translate')
const clips = await import('../../api/clips')
const news = await import('../../api/news')
const { clearAccessCache, requireApproved } = await import('../../api/_account')

const ALI = 'a'.repeat(64)
const ALI_TOKEN = '1'.repeat(64)
const VELI = 'b'.repeat(64)
const VELI_TOKEN = '2'.repeat(64)
const APP = { 'sec-fetch-site': 'same-origin' }
const as = (id: string, token: string) => ({ ...APP, 'x-sync-id': id, 'x-sync-auth': token })
const ADMIN = { authorization: 'Bearer owner-secret' }

const get = (headers: Record<string, string>) => access.GET(new Request('https://app.test/api/access', { headers }))
const post = (headers: Record<string, string>, body: unknown) => access.POST(new Request('https://app.test/api/access', { method: 'POST', headers, body: JSON.stringify(body) }))
const adminGet = (headers: Record<string, string> = ADMIN) => admin.GET(new Request('https://app.test/api/admin', { headers }))
const adminPost = (action: string, id: string, headers: Record<string, string> = ADMIN) => admin.POST(new Request('https://app.test/api/admin', { method: 'POST', headers, body: JSON.stringify({ action, id }) }))
const json = async (r: Response) => ({ status: r.status, ...(await r.json()) })

beforeEach(() => {
  blobs.clear()
  clearAccessCache()
  vi.stubEnv('ADMIN_TOKEN', 'owner-secret')
  vi.stubEnv('DEEPL_AUTH_KEY', 'abc123:fx')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('/api/access: signing up for the owner\'s approval', () => {
  it('tells an unclaimed id from a claimed one, and a right token from a wrong one', async () => {
    expect(await json(await get(as(ALI, ALI_TOKEN)))).toMatchObject({ status: 'none', exists: false, match: false })
    expect((await post(as(ALI, ALI_TOKEN), { username: 'ali', note: 'arkadaşım' })).status).toBe(200)
    expect(await json(await get(as(ALI, ALI_TOKEN)))).toMatchObject({ status: 'pending', exists: true, match: true })
    // Someone else with the id but not the token: it exists, it is not theirs, and nothing is said of its approval.
    expect(await json(await get(as(ALI, VELI_TOKEN)))).toMatchObject({ status: 'none', exists: true, match: false })
    expect((await post(as(ALI, VELI_TOKEN), { username: 'ali' })).status).toBe(403)
  })

  it('refuses strangers, malformed requests and bad names', async () => {
    expect((await get({ 'x-sync-id': ALI, 'x-sync-auth': ALI_TOKEN })).status).toBe(403) // not from the app
    const visitor = await get(APP)
    expect(visitor.status).toBe(200)
    expect(await visitor.json()).toMatchObject({ enabled: true })
    expect((await get({ ...APP, 'x-sync-id': ALI })).status).toBe(400)
    expect((await get({ ...APP, 'x-sync-id': 'zz', 'x-sync-auth': ALI_TOKEN })).status).toBe(400)
    expect((await post(as(ALI, ALI_TOKEN), { username: 'a' })).status).toBe(400)
    expect((await post(as(ALI, ALI_TOKEN), { username: 'ali baba' })).status).toBe(400)
    expect([...blobs.keys()].filter((k) => k.startsWith('access/') || k.startsWith('sync/'))).toEqual([])
  })

  it('keeps the note short and the waiting request up to date', async () => {
    await post(as(ALI, ALI_TOKEN), { username: 'ali', note: 'x'.repeat(500) })
    const filed = JSON.parse(new TextDecoder().decode(blobs.get(`access/requests/${ALI}.json`)!))
    expect(filed).toMatchObject({ username: 'ali' })
    expect(filed.note).toHaveLength(200)
  })
})

describe('/api/admin: the owner decides', () => {
  const signUp = async () => {
    await post(as(ALI, ALI_TOKEN), { username: 'ali', note: 'arkadaşım' })
    await post(as(VELI, VELI_TOKEN), { username: 'veli' })
  }

  it('is off without ADMIN_TOKEN and closed to a wrong one', async () => {
    vi.stubEnv('ADMIN_TOKEN', '')
    expect((await adminGet()).status).toBe(503)
    vi.stubEnv('ADMIN_TOKEN', 'owner-secret')
    expect((await adminGet({ authorization: 'Bearer nope' })).status).toBe(403)
    expect((await adminGet({})).status).toBe(403)
    expect((await adminPost('approve', ALI, { authorization: 'Bearer nope' })).status).toBe(403)
  })

  it('shows who waits with their username and note; approving, turning down and taking back move them between the lists', async () => {
    await signUp()
    const first = await json(await adminGet())
    expect(first.pending.map((e: { username: string }) => e.username).sort()).toEqual(['ali', 'veli'])
    expect(first.pending.find((e: { username: string }) => e.username === 'ali')).toMatchObject({ id: ALI, note: 'arkadaşım' })

    expect((await adminPost('approve', ALI)).status).toBe(200)
    expect((await adminPost('reject', VELI)).status).toBe(200)
    const after = await json(await adminGet())
    expect(after.pending).toEqual([])
    expect(after.approved.map((e: { username: string }) => e.username)).toEqual(['ali'])
    expect(after.rejected.map((e: { username: string }) => e.username)).toEqual(['veli'])
    expect(await json(await get(as(ALI, ALI_TOKEN)))).toMatchObject({ status: 'approved' })
    expect(await json(await get(as(VELI, VELI_TOKEN)))).toMatchObject({ status: 'rejected' })

    // An answer stands: signing up again does not put a turned-down account back in the queue.
    await post(as(VELI, VELI_TOKEN), { username: 'veli' })
    expect((await json(await adminGet())).pending).toEqual([])

    await adminPost('revoke', ALI)
    expect(await json(await get(as(ALI, ALI_TOKEN)))).toMatchObject({ status: 'rejected' })
    await adminPost('approve', VELI)
    expect(await json(await get(as(VELI, VELI_TOKEN)))).toMatchObject({ status: 'approved' })
    expect((await adminPost('promote', ALI)).status).toBe(400)
    expect((await adminPost('approve', 'zz')).status).toBe(400)
  })

  it('a username in SYNC_ALLOWED is approved from the start (how the owner\'s own account begins)', async () => {
    const ali = ALI
    vi.stubEnv('SYNC_ALLOWED', ali)
    await post(as(ALI, ALI_TOKEN), { username: 'ali' })
    expect(await json(await get(as(ALI, ALI_TOKEN)))).toMatchObject({ status: 'approved' })
    expect(await json(await get(as(VELI, VELI_TOKEN)))).toMatchObject({ status: 'none' })
  })
})

describe('what needs an approved account', () => {
  const ask = (headers: Record<string, string>) => requireApproved(new Request('https://app.test/api/x', { headers }))

  it('says what is missing: no account, a wrong token, waiting, turned down; lets an approved account through', async () => {
    const none = (await ask(APP))!
    expect(none.status).toBe(403)
    expect(await none.json()).toMatchObject({ error: 'account_required', status: 'none' })
    await post(as(ALI, ALI_TOKEN), { username: 'ali' })
    expect(await json((await ask(as(ALI, VELI_TOKEN)))!)).toMatchObject({ error: 'account_required' })
    expect(await json((await ask(as(ALI, ALI_TOKEN)))!)).toMatchObject({ error: 'approval_required', status: 'pending' })
    await adminPost('reject', ALI)
    expect(await json((await ask(as(ALI, ALI_TOKEN)))!)).toMatchObject({ error: 'approval_required', status: 'rejected' })
    await adminPost('approve', ALI)
    expect(await ask(as(ALI, ALI_TOKEN))).toBeNull()
    await adminPost('revoke', ALI)
    expect(await ask(as(ALI, ALI_TOKEN))).not.toBeNull()
  })

  it('closes translation, clips and news to accounts that are not approved, before any quota is used', async () => {
    const fetched = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetched)
    vi.stubEnv('YOUTUBE_API_KEY', 'k')
    const t = (headers: Record<string, string>) => translate.GET(new Request('https://app.test/api/translate?text=Bonjour&from=fr&to=tr', { headers }))
    const c = (headers: Record<string, string>) => clips.GET(new Request('https://app.test/api/clips?q=décider&lang=fr', { headers }))
    const n = (headers: Record<string, string>) => news.GET(new Request('https://app.test/api/news?feed=lemonde', { headers }))
    for (const call of [t, c, n]) {
      expect((await call(APP)).status).toBe(403)
      expect(await json(await call(as(ALI, ALI_TOKEN)))).toMatchObject({ error: 'account_required' })
    }
    await post(as(ALI, ALI_TOKEN), { username: 'ali' })
    for (const call of [t, c, n]) expect(await json(await call(as(ALI, ALI_TOKEN)))).toMatchObject({ error: 'approval_required', status: 'pending' })
    expect(fetched).not.toHaveBeenCalled()
  })
})

describe('/api/sync and the approval', () => {
  const put = (id: string, headers: Record<string, string>) => sync.PUT(new Request(`https://app.test/api/sync?id=${id}&part=core`, { method: 'PUT', headers, body: 'sealed' }))
  const read = (id: string, headers: Record<string, string>) => sync.GET(new Request(`https://app.test/api/sync?id=${id}&part=core`, { headers }))

  it('an account stores and reads only once approved; nothing is written or claimed before', async () => {
    const h = { 'x-sync-auth': ALI_TOKEN }
    expect(await (await put(ALI, h)).text()).toBe('approval required')
    expect((await read(ALI, h)).status).toBe(403)
    expect([...blobs.keys()].filter((k) => k.startsWith('sync/'))).toEqual([])
    await post(as(ALI, ALI_TOKEN), { username: 'ali' })
    await adminPost('approve', ALI)
    expect((await put(ALI, h)).status).toBe(204)
    expect((await read(ALI, h)).status).toBe(200)
    // The wrong token on an approved id is still refused by the password check.
    expect((await read(ALI, { 'x-sync-auth': VELI_TOKEN })).status).toBe(403)
  })

  it('a sync code (no token) works as before', async () => {
    expect((await put('c'.repeat(64), {})).status).toBe(204)
    expect((await read('c'.repeat(64), {})).status).toBe(200)
  })
})

describe('before the owner has set ADMIN_TOKEN', () => {
  it('nothing is withheld: every account counts as approved, sync and the quota endpoints work as before', async () => {
    vi.stubEnv('ADMIN_TOKEN', '')
    // A visitor is told approval is not asked for.
    expect(await json(await get(APP))).toMatchObject({ enabled: false })
    expect((await post(as(ALI, ALI_TOKEN), { username: 'ali' })).status).toBe(200)
    expect(await json(await get(as(ALI, ALI_TOKEN)))).toMatchObject({ status: 'approved', exists: true, match: true })
    // No request is filed: there is nobody to approve it.
    expect([...blobs.keys()].filter((k) => k.startsWith('access/'))).toEqual([])
    expect(await requireApproved(new Request('https://app.test/api/x', { headers: as(ALI, ALI_TOKEN) }))).toBeNull()
    // Anonymous visitors (no account headers) are not turned away either.
    expect(await requireApproved(new Request('https://app.test/api/x'))).toBeNull()
    const put = await sync.PUT(new Request(`https://app.test/api/sync?id=${VELI}&part=core`, { method: 'PUT', headers: { 'x-sync-auth': VELI_TOKEN }, body: 'sealed' }))
    expect(put.status).toBe(204)
  })

  it('the old SYNC_ALLOWED list still decides which accounts may sync', async () => {
    vi.stubEnv('ADMIN_TOKEN', '')
    vi.stubEnv('SYNC_ALLOWED', ALI)
    const ask = (id: string, token: string) => sync.GET(new Request(`https://app.test/api/sync?id=${id}&part=core`, { headers: { 'x-sync-auth': token } }))
    expect(await (await ask(VELI, VELI_TOKEN)).text()).toBe('not allowed')
    expect((await ask(ALI, ALI_TOKEN)).status).toBe(404)
  })
})
