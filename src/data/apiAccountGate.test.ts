import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// With Supabase sign-in the server must not be open to people without an account, even while the owner does not approve accounts.
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
const account = { 'x-sync-id': ID, 'x-sync-auth': TOKEN }
const ask = (headers: Record<string, string> = {}) => new Request('https://app.test/api/translate?text=hi', { headers })
const write = (headers: Record<string, string>) =>
  new Request(`https://app.test/api/sync?id=${ID}&part=core`, { method: 'PUT', headers, body: new Uint8Array([1, 2, 3]) })

beforeEach(() => {
  blobs.clear()
  clearAccessCache()
  vi.stubEnv('ADMIN_TOKEN', '')
})
afterEach(() => vi.unstubAllEnvs())

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

  it('Supabase on: a first write does not open an account, with or without a token', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    expect((await PUT(write({ 'x-sync-auth': TOKEN }))).status).toBe(403)
    expect((await PUT(write({}))).status).toBe(403)
    expect(blobs.size).toBe(0)
    // An account made through its sign-in writes as before.
    expect(await claimAccount(ID, TOKEN)).toBe(true)
    expect((await PUT(write({ 'x-sync-auth': TOKEN }))).status).toBe(204)
  })

  it('Supabase off: the old first write still opens the account', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    expect((await PUT(write({ 'x-sync-auth': TOKEN }))).status).toBe(204)
  })
})
