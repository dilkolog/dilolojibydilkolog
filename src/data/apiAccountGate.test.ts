import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// With Supabase sign-in the server must not be open to people without an account, even while the owner does not approve accounts
// (APPROVAL=off), and with approval on (the default with Supabase) only the people the owner approved get in.
const blobs = new Map<string, Uint8Array>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: ArrayBuffer | string) => {
    blobs.set(path, typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body))
    return {}
  },
  get: async (path: string) => (blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)!.slice()).body } : null),
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })) }),
  del: async (path: string) => void blobs.delete(path),
}))

const { requireApproved, clearAccessCache, claimAccount } = await import('../../api/_account')
const { PUT } = await import('../../api/sync')

const ID = 'a'.repeat(64)
const TOKEN = 'c'.repeat(64)
const { bytesBacking, fakeServerDocs } = await import('../test/fakeServerDocs')
// With Supabase on, the account keys and approval marks are documents in Supabase (kept in the R2 map here); the rest
// of Supabase (the people's profiles) cannot be reached from the test.
const { serveDocs } = fakeServerDocs(bytesBacking(blobs))
const supabaseFetch = async (input: string | URL | Request, init?: RequestInit) => serveDocs(String(input), init) ?? Response.json({}, { status: 503 })
const account = { 'x-sync-id': ID, 'x-sync-auth': TOKEN }
const ask = (headers: Record<string, string> = {}) => new Request('https://app.test/api/translate?text=hi', { headers })
const write = (headers: Record<string, string>) =>
  new Request(`https://app.test/api/sync?id=${ID}&part=core`, { method: 'PUT', headers, body: new Uint8Array([1, 2, 3]) })

beforeEach(() => {
  blobs.clear()
  clearAccessCache()
  vi.stubEnv('APPROVAL', 'off')
  vi.stubGlobal('fetch', supabaseFetch)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('without the owner approving accounts', () => {
  it('Supabase off (local development): nothing is withheld', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    expect(await requireApproved(ask())).toBeNull()
  })

  it('Supabase on: a request needs an account, an anonymous one is refused', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    const refused = await requireApproved(ask())
    expect(refused?.status).toBe(403)
    expect(await refused?.json()).toMatchObject({ error: 'account_required' })
    // Not just any headers: the token must be the claimed account's.
    expect((await requireApproved(ask(account)))?.status).toBe(403)
    expect(await claimAccount(ID, TOKEN)).toBe(true)
    expect(await requireApproved(ask(account))).toBeNull()
    expect((await requireApproved(ask({ ...account, 'x-sync-auth': 'd'.repeat(64) })))?.status).toBe(403)
  })

  it('Supabase on: the old store takes no writes at all, not even from an account made through its sign-in', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    expect((await PUT(write({ 'x-sync-auth': TOKEN }))).status).toBe(410)
    expect((await PUT(write({}))).status).toBe(410)
    expect(await claimAccount(ID, TOKEN)).toBe(true)
    const before = blobs.size
    // Sync lives in Supabase now, with its limits; R2 only serves a device moving its old data over.
    expect((await PUT(write({ 'x-sync-auth': TOKEN }))).status).toBe(410)
    expect(blobs.size).toBe(before)
  })

  it('Supabase off: the old first write still opens the account', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    expect((await PUT(write({ 'x-sync-auth': TOKEN }))).status).toBe(204)
  })
})

describe('with Supabase on and the owner approving people (the default)', () => {
  beforeEach(() => {
    vi.stubEnv('APPROVAL', '')
    vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    // The people's profiles cannot be reached from the test: only the owner's marks count.
  })

  it('an account that exists but is not approved is refused with approval_required, an approved one passes', async () => {
    expect(await claimAccount(ID, TOKEN)).toBe(true)
    const refused = await requireApproved(ask(account))
    expect(refused?.status).toBe(403)
    expect(await refused?.json()).toMatchObject({ error: 'approval_required' })
    blobs.set(`access/approved/${ID}.json`, new TextEncoder().encode('{}'))
    clearAccessCache()
    expect(await requireApproved(ask(account))).toBeNull()
  })

  it('a write is refused, approved or not: sync is in Supabase', async () => {
    expect(await claimAccount(ID, TOKEN)).toBe(true)
    expect((await PUT(write({ 'x-sync-auth': TOKEN }))).status).toBe(410)
  })
})
