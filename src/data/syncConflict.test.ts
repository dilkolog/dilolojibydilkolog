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
const { deriveAccount, syncNow, syncUsage, SyncTooLargeError, CORE_LIMIT_BYTES } = await import('./sync')
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

describe('size of the synced data', () => {
  it('is remembered after a sync, and shown as a share of the limit with a warning from 80%', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    const phone = new KelimeDB('t-size-phone')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await syncNow(phone, acc)
    const bytes = (await phone.meta.get('syncSize'))?.value as number
    expect(bytes).toBeGreaterThan(100)
    expect(syncUsage(bytes).warn).toBe(false)
    expect(syncUsage(CORE_LIMIT_BYTES * 0.8)).toMatchObject({ percent: 80, warn: true })
    expect(syncUsage(CORE_LIMIT_BYTES * 3)).toMatchObject({ percent: 100, warn: true })
    expect(syncUsage(2_200_000).label).toBe('2,2 MB / 4,4 MB')
  }, 60_000)

  it('a core file over the server limit is a SyncTooLargeError, not "no internet"', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    const phone = new KelimeDB('t-size-big')
    const entry = createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date())
    // Random bytes do not compress: the sealed file is about as big as this.
    const noise = Array.from({ length: 110 }, () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(49_152))))).join('')
    await phone.vocabulary.put({ ...entry, note: noise } as never)
    await expect(syncNow(phone, acc)).rejects.toBeInstanceOf(SyncTooLargeError)
  }, 60_000)
})

describe('what the other devices brought', () => {
  it('counts new and deleted words, texts and settings on a later sync, and nothing on the first', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    const phone = new KelimeDB('t-news-phone')
    const laptop = new KelimeDB('t-news-laptop')
    const maison = createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date())
    await laptop.vocabulary.put(maison)
    await syncNow(laptop, acc)
    // The phone joining is not news.
    expect((await syncNow(phone, acc)).incoming).toEqual({ words: 0, removed: 0, texts: 0, settings: 0 })

    vi.setSystemTime(new Date('2026-10-06T09:00:00Z'))
    await laptop.vocabulary.put(createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date()))
    await laptop.deleteWord(maison.id)
    await laptop.saveSettings({ ...(((await laptop.getSettings()) ?? {}) as object), theme: 'dark' } as never)
    await syncNow(laptop, acc)
    const r = await syncNow(phone, acc)
    expect(r.incoming).toMatchObject({ words: 1, removed: 1 })
    expect(r.incoming.settings).toBeGreaterThanOrEqual(1)
    expect((await syncNow(phone, acc)).incoming).toEqual({ words: 0, removed: 0, texts: 0, settings: 0 })
  }, 60_000)
})
