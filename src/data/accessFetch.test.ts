import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The device's stored account, the Supabase sign-in and the vault, faked: accessFetch's renewal of a stale key.
const meta = new Map<string, unknown>()
vi.mock('./instance', () => ({
  db: {
    meta: {
      get: async (key: string) => (meta.has(key) ? { key, value: meta.get(key) } : undefined),
      put: async ({ key, value }: { key: string; value: unknown }) => void meta.set(key, value),
    },
  },
}))
let signedIn = true
vi.mock('./supabase', () => ({
  hasStoredSession: () => signedIn,
  currentSession: async () => (signedIn ? { access_token: 'jwt' } : null),
}))
const fetchVault = vi.fn()
const rotateVault = vi.fn()
vi.mock('./vault', () => ({ fetchVault: (...a: unknown[]) => fetchVault(...a), rotateVault: (...a: unknown[]) => rotateVault(...a) }))

const { accessFetch, renewSyncKey } = await import('./access')

const OLD = { kind: 'account', username: 'ali', id: 'a'.repeat(64), enc: 'c'.repeat(64), auth: '1'.repeat(64) }
const NEW_AUTH = '9'.repeat(64)
const stale = () => Response.json({ error: 'account_required', status: 'none' }, { status: 403 })

let calls: { url: string; auth: string | null; body: unknown }[] = []
beforeEach(() => {
  meta.clear()
  meta.set('syncAccount', OLD)
  signedIn = true
  calls = []
  fetchVault.mockReset()
  rotateVault.mockReset()
})
afterEach(() => vi.unstubAllGlobals())

const server = (accepts: string) =>
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const auth = new Headers(init.headers).get('x-sync-auth')
    calls.push({ url, auth, body: init.body })
    return auth === accepts ? Response.json({ ok: true }) : stale()
  })

describe('accessFetch with a renewed key', () => {
  it('fetches the new key with the sign-in, saves it and sends the request again', async () => {
    server(NEW_AUTH)
    fetchVault.mockResolvedValue({ ...OLD, auth: NEW_AUTH })
    const res = await accessFetch('/api/translate', { method: 'POST', body: '{"text":"x"}' })
    expect(res.status).toBe(200)
    expect(calls.map((c) => c.auth)).toEqual([OLD.auth, NEW_AUTH])
    expect(calls[1].body).toBe('{"text":"x"}')
    expect((meta.get('syncAccount') as typeof OLD).auth).toBe(NEW_AUTH)
    expect((meta.get('syncAccount') as typeof OLD).enc).toBe(OLD.enc)
  })

  it('gives the refusal back when the vault holds the same key, or the device is signed out', async () => {
    server(NEW_AUTH)
    fetchVault.mockResolvedValue(OLD)
    expect((await accessFetch('/api/ai')).status).toBe(403)
    expect(calls).toHaveLength(1)
    signedIn = false
    expect((await accessFetch('/api/ai')).status).toBe(403)
    expect(fetchVault).toHaveBeenCalledTimes(1)
  })

  it('leaves other refusals alone (waiting for approval)', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ error: 'approval_required', status: 'pending' }, { status: 403 }))
    expect((await accessFetch('/api/ai')).status).toBe(403)
    expect(fetchVault).not.toHaveBeenCalled()
  })

  it('asks the vault once for requests that fail together', async () => {
    server(NEW_AUTH)
    fetchVault.mockImplementation(async () => ({ ...OLD, auth: NEW_AUTH }))
    const all = await Promise.all([accessFetch('/api/a'), accessFetch('/api/b'), accessFetch('/api/c')])
    expect(all.map((r) => r.status)).toEqual([200, 200, 200])
    expect(fetchVault).toHaveBeenCalledTimes(1)
  })
})

describe('renewSyncKey', () => {
  it('keeps the device on the new key', async () => {
    rotateVault.mockResolvedValue({ id: OLD.id, auth: NEW_AUTH })
    expect(await renewSyncKey()).toBe(true)
    expect(rotateVault).toHaveBeenCalledWith('jwt')
    expect((meta.get('syncAccount') as typeof OLD).auth).toBe(NEW_AUTH)
  })

  it('is false signed out or when the server cannot', async () => {
    signedIn = false
    expect(await renewSyncKey()).toBe(false)
    signedIn = true
    rotateVault.mockRejectedValue(new Error('unavailable'))
    expect(await renewSyncKey()).toBe(false)
    expect((meta.get('syncAccount') as typeof OLD).auth).toBe(OLD.auth)
  })
})
