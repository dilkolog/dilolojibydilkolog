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
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })) }),
  del: async (path: string) => void blobs.delete(path),
}))

const api = await import('../../api/sync')
const { clearAccessCache } = await import('../../api/_account')
const { deriveAccount, restoreFrom, restorePoints, syncNow } = await import('./sync')
const { KelimeDB } = await import('./db')
const { createEntry } = await import('./wordInput')

/** The owner's approval of an account, as the admin endpoint leaves it. */
const approve = (id: string) => void blobs.set(`access/approved/${id}.json`, new TextEncoder().encode('{}'))

beforeEach(() => {
  blobs.clear()
  clearAccessCache()
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const req = new Request(`https://app.test${url}`, init)
    return req.method === 'PUT' ? api.PUT(req) : api.GET(req)
  })
  vi.useFakeTimers({ toFake: ['Date'] })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('restore points', () => {
  it('bring back a word deleted since, keep one added later, and the other device keeps it too', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    approve(acc.id)
    const phone = new KelimeDB('t-restore-phone')
    const laptop = new KelimeDB('t-restore-laptop')
    vi.setSystemTime(new Date('2026-10-05T09:00:00Z'))
    const maison = createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date())
    await phone.vocabulary.put(maison)
    await syncNow(phone, acc)
    await syncNow(laptop, acc)

    // Next day: the word is deleted by mistake on the phone and synced everywhere; a new word comes in.
    vi.setSystemTime(new Date('2026-10-06T09:00:00Z'))
    await phone.deleteWord(maison.id)
    await phone.vocabulary.put(createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date()))
    await syncNow(phone, acc)
    await syncNow(laptop, acc)
    expect((await laptop.vocabulary.toArray()).map((v) => v.lemma)).toEqual(['chat'])

    // The laptop's first sync on the 5th replaced the phone's core too: a point for each day.
    expect(await restorePoints(acc)).toEqual(['2026-10-06', '2026-10-05'])
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'))
    expect(await restoreFrom(phone, acc, '2026-10-06')).toBe(1)
    expect((await phone.vocabulary.toArray()).map((v) => v.lemma).sort()).toEqual(['chat', 'maison'])

    // The phone sends it on; the laptop, which had the deletion, keeps the word now.
    await syncNow(phone, acc)
    await syncNow(laptop, acc)
    expect((await laptop.vocabulary.toArray()).map((v) => v.lemma).sort()).toEqual(['chat', 'maison'])
  }, 60_000)
})
