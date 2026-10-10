import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// An in-memory Blob store with ETags, like the real one: a write that names an old ETag fails.
const blobs = new Map<string, { bytes: Uint8Array; etag: string }>()
let version = 0
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: ArrayBuffer | string, opts: { allowOverwrite?: boolean; ifMatch?: string }) => {
    if (opts.allowOverwrite === false && blobs.has(path)) throw new Error('exists')
    if (opts.ifMatch && blobs.get(path)?.etag !== opts.ifMatch) throw Object.assign(new Error('precondition'), { name: 'BlobPreconditionFailedError' })
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

const api = await import('../../api/sync')
const { deriveAccount, syncNow } = await import('./sync')
const { KelimeDB } = await import('./db')
const { createEntry } = await import('./wordInput')

let corePuts = 0
let beforeCorePut: (() => Promise<void>) | null = null
beforeEach(() => {
  blobs.clear()
  corePuts = 0
  beforeCorePut = null
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const req = new Request(`https://app.test${url}`, init)
    if (req.method !== 'PUT') return api.GET(req)
    if (new URL(req.url).searchParams.get('part') === 'core') {
      corePuts++
      const hook = beforeCorePut
      beforeCorePut = null
      await hook?.()
    }
    return api.PUT(req)
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-05T09:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('two devices syncing at once', () => {
  it('the one that loses the race merges again instead of overwriting the other', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    const phone = new KelimeDB('t-race-phone')
    const laptop = new KelimeDB('t-race-laptop')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await syncNow(phone, acc)
    await syncNow(laptop, acc)

    await phone.vocabulary.put(createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date()))
    await laptop.vocabulary.put(createEntry({ word: 'chien', meaning: 'köpek' }, 'fr', new Date()))
    // The phone gets its sync in between the laptop's read of the core file and its write.
    beforeCorePut = async () => void (await syncNow(phone, acc))
    corePuts = 0
    await syncNow(laptop, acc)
    expect(corePuts).toBeGreaterThanOrEqual(3) // laptop (refused), phone, laptop again
    expect((await laptop.vocabulary.toArray()).map((v) => v.lemma).sort()).toEqual(['chat', 'chien', 'maison'])

    await syncNow(phone, acc)
    expect((await phone.vocabulary.toArray()).map((v) => v.lemma).sort()).toEqual(['chat', 'chien', 'maison'])
  }, 60_000)
})
