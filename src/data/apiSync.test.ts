import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// An in-memory Blob store behind the real /api/sync handlers.
const blobs = new Map<string, Uint8Array>()
// Set to make the store itself fail (not "missing").
let failing = false
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: ArrayBuffer | string, opts: { allowOverwrite?: boolean }) => {
    if (opts.allowOverwrite === false && blobs.has(path)) throw new Error('exists')
    blobs.set(path, typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body))
    return {}
  },
  get: async (path: string) => {
    if (failing) throw new Error('blob store unavailable')
    return blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)!.slice()).body } : null
  },
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })) }),
  del: async (path: string) => void blobs.delete(path),
}))

const { GET, PUT } = await import('../../api/sync')
const { allowedIds } = await import('../../api/_allow')
const { clearAccessCache } = await import('../../api/_account')
const { deriveAccount, syncIdOf } = await import('./sync')

const ID = 'a'.repeat(64)
const OTHER = 'b'.repeat(64)
const TOKEN = 'c'.repeat(64)
const WRONG = 'd'.repeat(64)

function req(opts: { id?: string; part?: string; token?: string; body?: string | Uint8Array<ArrayBuffer> } = {}) {
  const q = new URLSearchParams({ id: opts.id ?? ID, part: opts.part ?? 'core' })
  const headers: Record<string, string> = opts.token ? { 'x-sync-auth': opts.token } : {}
  return new Request(`https://app.test/api/sync?${q}`, opts.body === undefined ? { headers } : { method: 'PUT', headers, body: opts.body })
}
const read = async (r: Response) => ({ status: r.status, text: await r.text() })

/** The owner's approval of an account, as the admin endpoint leaves it. */
const approve = (id: string) => void blobs.set(`access/approved/${id}.json`, new TextEncoder().encode('{}'))

beforeEach(() => {
  blobs.clear()
  clearAccessCache()
  failing = false
  // The accounts these tests use are approved; the approval itself is tested in access.test.ts.
  approve(ID)
  approve(OTHER)
})
afterEach(() => vi.unstubAllEnvs())

describe('/api/sync when the store itself fails', () => {
  it('says "try later" (502), never "no data" (404): a device must not take empty for the truth and write over the real data', async () => {
    expect((await PUT(req({ body: 'sealed' }))).status).toBe(204)
    failing = true
    expect((await GET(req())).status).toBe(502)
    // Nothing is written while the store cannot be read (the owner's claim cannot be checked either).
    expect((await PUT(req({ body: 'overwrite' }))).status).toBe(502)
    failing = false
    expect(await read(await GET(req()))).toEqual({ status: 200, text: 'sealed' })
  })
})

describe('/api/sync requests', () => {
  it('refuses malformed ids, parts and tokens before touching storage', async () => {
    expect((await GET(req({ id: 'abc' }))).status).toBe(400)
    expect((await GET(req({ id: ID.toUpperCase() }))).status).toBe(400)
    expect((await GET(req({ part: '../core' }))).status).toBe(400)
    expect((await GET(req({ part: 'm-123' }))).status).toBe(400)
    expect((await GET(req({ token: 'short' }))).status).toBe(400)
    expect((await PUT(req({ id: 'abc', body: 'x' }))).status).toBe(400)
    expect([...blobs.keys()].filter((k) => k.startsWith('sync/'))).toEqual([])
  })

  it('refuses an empty or oversized body', async () => {
    expect((await PUT(req({ body: '' }))).status).toBe(413)
    expect((await PUT(req({ body: new Uint8Array(4_400_001) }))).status).toBe(413)
    expect([...blobs.keys()].filter((k) => k.startsWith('sync/'))).toEqual([])
  })

  it('stores and returns the bytes of a sync code (no token), and 404s what is missing', async () => {
    expect((await GET(req())).status).toBe(404)
    expect((await PUT(req({ body: 'sealed' }))).status).toBe(204)
    expect(await read(await GET(req()))).toEqual({ status: 200, text: 'sealed' })
    // Media parts live next to the core under the same id.
    const media = `m-${'0'.repeat(40)}`
    expect((await PUT(req({ part: media, body: 'pic' }))).status).toBe(204)
    expect(await read(await GET(req({ part: media })))).toEqual({ status: 200, text: 'pic' })
    expect(blobs.has(`sync/${ID}/auth.txt`)).toBe(false)
  })
})

describe('/api/sync accounts', () => {
  it('claims an id on its first write and then refuses everyone without the token', async () => {
    expect((await PUT(req({ token: TOKEN, body: 'mine' }))).status).toBe(204)
    expect(blobs.has(`sync/${ID}/auth.txt`)).toBe(true)
    // The token itself is never stored, only its hash.
    expect(new TextDecoder().decode(blobs.get(`sync/${ID}/auth.txt`))).not.toContain(TOKEN)

    expect(await read(await GET(req({ token: TOKEN })))).toEqual({ status: 200, text: 'mine' })
    expect(await read(await GET(req()))).toEqual({ status: 403, text: 'forbidden' })
    expect(await read(await GET(req({ token: WRONG })))).toEqual({ status: 403, text: 'forbidden' })
    expect((await PUT(req({ body: 'theirs' }))).status).toBe(403)
    expect((await PUT(req({ token: WRONG, body: 'theirs' }))).status).toBe(403)
    expect(await read(await GET(req({ token: TOKEN })))).toEqual({ status: 200, text: 'mine' })
  })

  it('does not claim an id on a read', async () => {
    expect((await GET(req({ token: TOKEN }))).status).toBe(404)
    expect(blobs.has(`sync/${ID}/auth.txt`)).toBe(false)
    // So the first writer, whoever it is, still gets it.
    expect((await PUT(req({ token: WRONG, body: 'x' }))).status).toBe(204)
    expect((await GET(req({ token: TOKEN }))).status).toBe(403)
  })

  it('keeps the first claim when two first writes race', async () => {
    const [a, b] = await Promise.all([PUT(req({ token: TOKEN, body: 'a' })), PUT(req({ token: WRONG, body: 'b' }))])
    expect([a.status, b.status].sort()).toEqual([204, 403])
  })
})

describe('/api/sync allowlist (SYNC_ALLOWED)', () => {
  it('lets everyone in when the list is unset or empty', async () => {
    expect(await allowedIds(undefined)).toBeNull()
    expect(await allowedIds(' , ')).toBeNull()
    vi.stubEnv('SYNC_ALLOWED', '')
    expect((await PUT(req({ id: OTHER, body: 'x' }))).status).toBe(204)
  })

  it('turns usernames into the ids the app derives, in any case, and keeps hex ids as they are', async () => {
    const ali = await deriveAccount('Ali', 'pw')
    const code = await syncIdOf('ABCDE-FGHIJ')
    const ids = await allowedIds(` ALİ,\n${code.toUpperCase()} `)
    expect(ids).toEqual(new Set([ali.id, code]))
    expect((await allowedIds('alı'))?.has(ali.id)).toBe(true)
  })

  it('refuses ids not on the list for reads and writes, with a reason the app can tell apart', async () => {
    vi.stubEnv('SYNC_ALLOWED', `someone, ${ID}`)
    expect(await read(await PUT(req({ id: OTHER, body: 'x' })))).toEqual({ status: 403, text: 'not allowed' })
    expect(await read(await GET(req({ id: OTHER })))).toEqual({ status: 403, text: 'not allowed' })
    expect([...blobs.keys()].filter((k) => k.startsWith('sync/'))).toEqual([])
    expect((await PUT(req({ body: 'x' }))).status).toBe(204)
    expect((await GET(req())).status).toBe(200)
  })

  it('still checks the token for an allowed account', async () => {
    const ali = await deriveAccount('ali', 'pw')
    vi.stubEnv('SYNC_ALLOWED', 'ali')
    expect((await PUT(req({ id: ali.id, token: ali.auth, body: 'x' }))).status).toBe(204)
    expect(await read(await GET(req({ id: ali.id, token: WRONG })))).toEqual({ status: 403, text: 'forbidden' })
  })

})

describe('/api/sync restore points', () => {
  const history = (id = ID, token?: string) => new Request(`https://app.test/api/sync?id=${id}&history=1`, { headers: token ? { 'x-sync-auth': token } : {} })

  it('keeps the core it replaces as the day\'s point, once a day, and lists the days', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-05T10:00:00Z'))
    expect((await PUT(req({ body: 'v1' }))).status).toBe(204)
    // The first core has nothing before it.
    expect(blobs.has(`sync/${ID}/h-2026-10-05.bin`)).toBe(false)
    await PUT(req({ body: 'v2' }))
    await PUT(req({ body: 'v3' }))
    // Today's point is the day's first replaced core, not overwritten later.
    expect(await read(await GET(req({ part: 'h-2026-10-05' })))).toEqual({ status: 200, text: 'v1' })
    vi.setSystemTime(new Date('2026-10-06T10:00:00Z'))
    await PUT(req({ body: 'v4' }))
    expect(await read(await GET(req({ part: 'h-2026-10-06' })))).toEqual({ status: 200, text: 'v3' })
    expect(await (await GET(history())).json()).toEqual({ days: ['2026-10-06', '2026-10-05'] })
    vi.useRealTimers()
  })

  it('keeps a week of points', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    for (let d = 1; d <= 10; d++) {
      vi.setSystemTime(new Date(`2026-10-${String(d).padStart(2, '0')}T10:00:00Z`))
      await PUT(req({ body: `v${d}` }))
    }
    const { days } = (await (await GET(history())).json()) as { days: string[] }
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-10-10')
    expect(days[6]).toBe('2026-10-04')
    vi.useRealTimers()
  })

  it('never takes a point sent from outside, and guards points like the core', async () => {
    expect((await PUT(req({ part: 'h-2026-10-05', body: 'forged' }))).status).toBe(405)
    // An account's points need its token.
    await PUT(req({ token: TOKEN, body: 'mine' }))
    await PUT(req({ token: TOKEN, body: 'mine2' }))
    expect((await GET(history(ID))).status).toBe(403)
    expect((await GET(history(ID, TOKEN))).status).toBe(200)
    expect((await GET(history('zz'))).status).toBe(400)
  })
})

