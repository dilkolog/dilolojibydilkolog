import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// An in-memory Blob store behind the real /api/sync handlers.
const blobs = new Map<string, Uint8Array>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: ArrayBuffer | string, opts: { allowOverwrite?: boolean }) => {
    if (opts.allowOverwrite === false && blobs.has(path)) throw new Error('exists')
    blobs.set(path, typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body))
    return {}
  },
  get: async (path: string) => (blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)!.slice()).body } : null),
}))

const api = await import('../../api/sync')
const { accountStatus, deriveAccount, syncNow, SyncAuthError, SyncNotAllowedError } = await import('./sync')
const { KelimeDB } = await import('./db')
const { createEntry } = await import('./wordInput')

beforeEach(() => {
  blobs.clear()
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const req = new Request(`https://app.test${url}`, init)
    return req.method === 'PUT' ? api.PUT(req) : api.GET(req)
  })
})
afterEach(() => vi.unstubAllEnvs())

describe('accounts', () => {
  it('derives the same id for a name in any case, and keys that depend on the password', async () => {
    const a = await deriveAccount('Ali', 'correct horse')
    const b = await deriveAccount(' ALİ ', 'correct horse')
    expect((await deriveAccount('alı', 'correct horse')).id).toBe(a.id)
    const c = await deriveAccount('ali', 'wrong horse')
    expect(a.id).toBe(b.id)
    expect(a.enc).toBe(b.enc)
    expect(c.id).toBe(a.id)
    expect(c.enc).not.toBe(a.enc)
    expect(a.auth).not.toBe(a.enc)
  }, 20_000)

  it('creates an account on first sync, signs in with the password, refuses a wrong one', async () => {
    const owner = await deriveAccount('ali', 'correct horse')
    expect(await accountStatus(owner)).toBe('new')
    const db = new KelimeDB('t-account-1')
    await db.vocabulary.put(createEntry({ word: 'decision', meaning: 'karar' }, 'en', new Date()))
    await syncNow(db, owner)
    expect(await accountStatus(owner)).toBe('ok')
    const { open: openSealed } = await import('./sync')
    const core = [...blobs.entries()].find(([k]) => k.endsWith('/core.bin'))!
    const plain = JSON.parse(new TextDecoder().decode(await openSealed(core[1] as Uint8Array<ArrayBuffer>, owner)))
    expect(plain.vocabulary.map((e: { lemma: string }) => e.lemma)).toEqual(['decision'])

    // Wrong password: can neither read nor overwrite.
    const intruder = await deriveAccount('ali', 'guess1234')
    expect(await accountStatus(intruder)).toBe('wrong')
    await expect(syncNow(new KelimeDB('t-account-2'), intruder)).rejects.toBeInstanceOf(SyncAuthError)

    // Another device with the password gets the word.
    const other = new KelimeDB('t-account-3')
    await syncNow(other, await deriveAccount('ALI', 'correct horse'))
    expect((await other.vocabulary.toArray()).map((e) => e.lemma)).toContain('decision')
  }, 60_000)

  it('tells an account the server does not serve apart from a wrong password', async () => {
    vi.stubEnv('SYNC_ALLOWED', 'ali')
    const stranger = await deriveAccount('veli', 'correct horse')
    await expect(accountStatus(stranger)).rejects.toBeInstanceOf(SyncNotAllowedError)
    await expect(syncNow(new KelimeDB('t-account-4'), stranger)).rejects.toBeInstanceOf(SyncNotAllowedError)
    expect(await accountStatus(await deriveAccount('ALİ', 'correct horse'))).toBe('new')
  }, 20_000)
})
