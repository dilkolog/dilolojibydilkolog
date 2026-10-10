import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
const { deriveAccount, MAX_MEDIA_BYTES, restoreFrom, syncNow } = await import('./sync')
const { KelimeDB, parseBackup, exportBackup } = await import('./db')
const { getSafetySnapshot, restoreSafetySnapshot, saveSafetySnapshot } = await import('./safetyBackup')
const { createEntry } = await import('./wordInput')

beforeEach(() => {
  blobs.clear()
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const req = new Request(`https://app.test${url}`, init)
    return req.method === 'PUT' ? api.PUT(req) : api.GET(req)
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-05T09:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('media that cannot be synced', () => {
  it('leaves a too-big picture behind without stopping the words or the small picture', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    const phone = new KelimeDB('t-media-phone')
    const laptop = new KelimeDB('t-media-laptop')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    const small = await phone.addMedia('image', new Blob([new Uint8Array(1000)], { type: 'image/jpeg' }))
    await phone.addMedia('image', new Blob([new Uint8Array(MAX_MEDIA_BYTES + 1)], { type: 'image/jpeg' }))

    const r = await syncNow(phone, acc)
    expect(r).toMatchObject({ sent: 1, skipped: 1 })
    const got = await syncNow(laptop, acc)
    expect(got).toMatchObject({ received: 1, skipped: 0 })
    expect((await laptop.vocabulary.toArray()).map((v) => v.lemma)).toEqual(['maison'])
    expect((await laptop.media.toCollection().primaryKeys())).toEqual([small])
  }, 60_000)

  it('keeps going when one picture fails to upload', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    const phone = new KelimeDB('t-media-fail')
    await phone.vocabulary.put(createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date()))
    await phone.addMedia('image', new Blob([new Uint8Array(500)], { type: 'image/jpeg' }))
    const real = fetch
    vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => (String(url).includes('part=m-') && init.method === 'PUT' ? new Response('', { status: 500 }) : real(url, init)))
    expect(await syncNow(phone, acc)).toMatchObject({ sent: 0, skipped: 1 })
    expect(blobs.size).toBeGreaterThan(0)
  }, 60_000)
})

describe('safety copy', () => {
  it('rejects damaged backups before anything is replaced', () => {
    expect(() => parseBackup('{"app":"kelime-koc","vocabulary":[{"lemma":"x"}]}')).toThrow('bozuk')
    expect(() => parseBackup('{"app":"kelime-koc","vocabulary":[],"events":{}}')).toThrow('bozuk')
    expect(parseBackup('{"app":"kelime-koc","vocabulary":[]}')).toMatchObject({ wordStates: [], events: [], mistakes: [] })
  })

  it('takes the data back after a restore', async () => {
    const db = new KelimeDB('t-safety')
    await db.vocabulary.put(createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date()))
    expect(await getSafetySnapshot(db)).toBeNull()
    await saveSafetySnapshot(db)
    await db.vocabulary.clear()
    await db.vocabulary.put(createEntry({ word: 'chien', meaning: 'köpek' }, 'fr', new Date()))
    expect(await restoreSafetySnapshot(db)).toBe(true)
    expect((await db.vocabulary.toArray()).map((v) => v.lemma)).toEqual(['chat'])
    expect(await getSafetySnapshot(db)).toBeNull()
    expect(await restoreSafetySnapshot(db)).toBe(false)
  })

  it('is not part of exports, and restoring a restore point leaves one', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    const phone = new KelimeDB('t-safety-point')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await syncNow(phone, acc)
    vi.setSystemTime(new Date('2026-10-06T09:00:00Z'))
    await phone.vocabulary.put(createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date()))
    await syncNow(phone, acc)
    await restoreFrom(phone, acc, '2026-10-06')
    const snap = await getSafetySnapshot(phone)
    expect(snap?.words).toBe(2)
    expect(await exportBackup(phone)).not.toContain('safetyBackup')
  }, 60_000)
})
