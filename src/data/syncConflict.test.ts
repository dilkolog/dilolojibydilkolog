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
const { clearAccessCache } = await import('../../api/_account')
const { deriveAccount, open, restoreReplaced, syncNow, syncUsage, SyncTooLargeError, CORE_LIMIT_BYTES } = await import('./sync')
const { KelimeDB } = await import('./db')
const { createEntry } = await import('./wordInput')

let corePuts = 0
let beforeCorePut: (() => Promise<void>) | null = null
/** The owner's approval of an account, as the admin endpoint leaves it. */
const approve = (id: string) => void blobs.set(`access/approved/${id}.json`, { bytes: new TextEncoder().encode('{}'), etag: '"a"' })

beforeEach(() => {
  blobs.clear()
  clearAccessCache()
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
    approve(acc.id)
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
    approve(acc.id)
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
    approve(acc.id)
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
    approve(acc.id)
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

describe('a word edited on another device', () => {
  it('names the words whose copy another device replaced, and can put the old copies back', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    approve(acc.id)
    const phone = new KelimeDB('t-edit-phone')
    const laptop = new KelimeDB('t-edit-laptop')
    const maison = createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date())
    await laptop.vocabulary.put(maison)
    await syncNow(laptop, acc)
    await syncNow(phone, acc)

    // The laptop corrects the meaning and syncs; the phone still has the old copy.
    vi.setSystemTime(new Date('2026-10-06T09:00:00Z'))
    await laptop.vocabulary.update(maison.id, { senses: [{ ...maison.senses[0], gloss: 'ev, konut' }] })
    await syncNow(laptop, acc)
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'))
    const r = await syncNow(phone, acc)
    expect(r.replaced).toEqual(['maison'])
    expect((await phone.vocabulary.get(maison.id))!.senses[0].gloss).toBe('ev, konut')

    // Taking it back puts the phone's old copy in and makes it the latest edit, so it wins the next sync too.
    vi.setSystemTime(new Date('2026-10-06T12:05:00Z'))
    expect(await restoreReplaced(phone)).toBe(1)
    expect((await phone.vocabulary.get(maison.id))!.senses[0].gloss).toBe('ev')
    expect(await restoreReplaced(phone)).toBe(0)
    await syncNow(phone, acc)
    await syncNow(laptop, acc)
    expect((await laptop.vocabulary.get(maison.id))!.senses[0].gloss).toBe('ev')
  }, 60_000)

  it('says nothing when nobody edited a shared word', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    approve(acc.id)
    const phone = new KelimeDB('t-edit2-phone')
    const laptop = new KelimeDB('t-edit2-laptop')
    await laptop.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await syncNow(laptop, acc)
    await syncNow(phone, acc)
    vi.setSystemTime(new Date('2026-10-06T09:00:00Z'))
    expect((await syncNow(phone, acc)).replaced).toBeUndefined()
  }, 60_000)
})

describe('an answer saved while a sync is reading', () => {
  it('is not erased by writing the merge back: the sync goes round again with it', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    approve(acc.id)
    const phone = new KelimeDB('t-midway-phone')
    const laptop = new KelimeDB('t-midway-laptop')
    await laptop.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await syncNow(laptop, acc)
    await syncNow(phone, acc)
    vi.setSystemTime(new Date('2026-10-06T09:00:00Z'))
    // The answer lands just after the phone's events were read for the sync, once.
    const original = phone.events.toArray.bind(phone.events)
    let injected = false
    vi.spyOn(phone.events, 'toArray').mockImplementation((async () => {
      const rows = await original()
      if (!injected) {
        injected = true
        await phone.events.put({ id: 'late', entryId: 'fr:maison', language: 'fr', skill: 'recognition', exerciseType: 'mc_meaning', direction: 'target_to_native', verdict: 'correct', correct: true, rating: 3, responseMs: 1, hintsUsed: 0, retrievabilityBefore: 1, stabilityAfter: 1, scheduledDays: 1, mode: 'normal', timestamp: new Date() } as never)
      }
      return rows
    }) as never)
    await syncNow(phone, acc)
    expect(injected).toBe(true)
    expect((await phone.events.toArray()).map((e) => e.id)).toContain('late')
  }, 60_000)
})


describe('answers and texts travel in parts of their own', () => {
  const answer = (id: string, at: string) =>
    ({ id, entryId: 'fr:maison', language: 'fr', skill: 'recognition', exerciseType: 'mc_meaning', direction: 'target_to_native', verdict: 'correct', correct: true, rating: 3, responseMs: 1, hintsUsed: 0, retrievabilityBefore: 1, stabilityAfter: 1, scheduledDays: 1, mode: 'normal', timestamp: new Date(at) }) as never
  const text = (id: string, history = 0) => ({ id, language: 'fr', title: id, text: `Bonjour ${id}`, addedAt: '2026-10-01T09:00:00.000Z', history: Array.from({ length: history }, (_, i) => ({ at: `2026-10-0${i + 1}T09:00:00.000Z`, coverage: 0.5 })) })
  const parts = () => [...blobs.keys()].filter((k) => /\/(ev|tx)-/.test(k)).map((k) => k.split('/')[2].replace('.bin', '')).sort()
  /** Counts what the PUTs of a sync wrote, by part name. */
  let puts: string[] = []
  beforeEach(() => {
    puts = []
    const stub = globalThis.fetch
    vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
      if (init.method === 'PUT') puts.push(new URL(`https://app.test${url}`).searchParams.get('part')!)
      return stub(url, init)
    })
  })

  async function joined() {
    const acc = await deriveAccount('ali', 'correct horse')
    approve(acc.id)
    return acc
  }

  it('each month of answers and each text is a file; the core holds neither, and the other device gets them', async () => {
    const acc = await joined()
    const phone = new KelimeDB('t-parts-phone')
    const laptop = new KelimeDB('t-parts-laptop')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await phone.events.bulkPut([answer('a1', '2026-08-03T09:00:00Z'), answer('a2', '2026-09-03T09:00:00Z'), answer('a3', '2026-09-04T09:00:00Z')])
    await phone.meta.put({ key: 'library', value: [text('t1')] })
    await syncNow(phone, acc)
    expect(parts().filter((p) => p.startsWith('ev-'))).toEqual(['ev-2026-08', 'ev-2026-09'])
    expect(parts().filter((p) => p.startsWith('tx-'))).toHaveLength(1)

    const core = JSON.parse(new TextDecoder().decode(await open(new Uint8Array(blobs.get(`sync/${acc.id}/core.bin`)!.bytes) as Uint8Array<ArrayBuffer>, acc)))
    expect(core.events).toEqual([])
    expect(core.reading.library).toEqual([])
    expect(Object.keys(core.shards).sort()).toEqual(parts().sort())
    expect(core.version).toBe(7)

    await syncNow(laptop, acc)
    expect((await laptop.events.toArray()).map((e) => e.id).sort()).toEqual(['a1', 'a2', 'a3'])
    expect((((await laptop.meta.get('library'))?.value ?? []) as { id: string }[]).map((t) => t.id)).toEqual(['t1'])
  }, 60_000)

  it('a sync with nothing new sends no part, and one new answer sends only its month', async () => {
    const acc = await joined()
    const phone = new KelimeDB('t-parts-quiet')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await phone.events.bulkPut([answer('a1', '2026-08-03T09:00:00Z'), answer('a2', '2026-09-03T09:00:00Z')])
    await phone.meta.put({ key: 'library', value: [text('t1'), text('t2')] })
    await syncNow(phone, acc)

    puts = []
    await syncNow(phone, acc)
    expect(puts).toEqual(['core'])

    vi.setSystemTime(new Date('2026-10-06T09:00:00Z'))
    await phone.events.put(answer('a3', '2026-10-06T09:00:00Z'))
    puts = []
    await syncNow(phone, acc)
    expect(puts.sort()).toEqual(['core', 'ev-2026-10'])
  }, 60_000)

  it('answers both devices gave in the same month are both kept', async () => {
    const acc = await joined()
    const phone = new KelimeDB('t-parts-same-phone')
    const laptop = new KelimeDB('t-parts-same-laptop')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await phone.events.put(answer('p0', '2026-10-01T09:00:00Z'))
    await syncNow(phone, acc)
    await syncNow(laptop, acc)
    await phone.events.put(answer('p1', '2026-10-02T09:00:00Z'))
    await laptop.events.put(answer('l1', '2026-10-03T09:00:00Z'))
    await syncNow(phone, acc)
    await syncNow(laptop, acc)
    await syncNow(phone, acc)
    for (const db of [phone, laptop]) expect((await db.events.toArray()).map((e) => e.id).sort()).toEqual(['l1', 'p0', 'p1'])
  }, 60_000)

  it('two devices syncing at once do not lose each other\'s answers in the shared month', async () => {
    const acc = await joined()
    const phone = new KelimeDB('t-parts-race-phone')
    const laptop = new KelimeDB('t-parts-race-laptop')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await phone.events.put(answer('p0', '2026-10-01T09:00:00Z'))
    await syncNow(phone, acc)
    await syncNow(laptop, acc)
    await phone.events.put(answer('p1', '2026-10-02T09:00:00Z'))
    await laptop.events.put(answer('l1', '2026-10-03T09:00:00Z'))
    beforeCorePut = async () => void (await syncNow(phone, acc))
    await syncNow(laptop, acc)
    await syncNow(phone, acc)
    for (const db of [phone, laptop]) expect((await db.events.toArray()).map((e) => e.id).sort()).toEqual(['l1', 'p0', 'p1'])
  }, 60_000)

  it('a text read further on one device replaces the shorter history on the other; a deleted text is gone', async () => {
    const acc = await joined()
    const phone = new KelimeDB('t-parts-text-phone')
    const laptop = new KelimeDB('t-parts-text-laptop')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await phone.meta.put({ key: 'library', value: [text('t1'), text('t2')] })
    await syncNow(phone, acc)
    await syncNow(laptop, acc)
    vi.setSystemTime(new Date('2026-10-06T09:00:00Z'))
    await laptop.meta.put({ key: 'library', value: [text('t1', 2), text('t2')] })
    await laptop.addDeleted(['t2'])
    await laptop.meta.put({ key: 'library', value: [text('t1', 2)] })
    await syncNow(laptop, acc)
    await syncNow(phone, acc)
    const library = (await phone.meta.get('library'))?.value as { id: string; history: unknown[] }[]
    expect(library.map((t) => [t.id, t.history.length])).toEqual([['t1', 2]])
  }, 60_000)

  it('still reads a core file from before the split, answers and all, and the next sync splits it', async () => {
    const acc = await joined()
    const laptop = new KelimeDB('t-parts-old-laptop')
    const old = new KelimeDB('t-parts-old-src')
    await old.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await old.events.put(answer('o1', '2026-09-10T09:00:00Z'))
    const { exportBackup } = await import('./db')
    const { seal } = await import('./sync')
    const backup = JSON.parse(await exportBackup(old, new Date(), { media: false }))
    backup.version = 6
    const sealed = await seal(new TextEncoder().encode(JSON.stringify(backup)), acc)
    blobs.set(`sync/${acc.id}/core.bin`, { bytes: sealed, etag: '"old"' })
    await syncNow(laptop, acc)
    expect((await laptop.events.toArray()).map((e) => e.id)).toEqual(['o1'])
    expect(parts()).toEqual(['ev-2026-09'])
  }, 60_000)

  it('a part left behind by a sync that never finished does not block the next one', async () => {
    const acc = await joined()
    const phone = new KelimeDB('t-parts-orphan')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await phone.events.put(answer('p0', '2026-10-01T09:00:00Z'))
    await syncNow(phone, acc)
    // Wipe the core only: the part stays, unlisted.
    blobs.delete(`sync/${acc.id}/core.bin`)
    await expect(syncNow(phone, acc)).resolves.toBeDefined()
    expect(blobs.has(`sync/${acc.id}/core.bin`)).toBe(true)
    expect((await phone.events.toArray()).map((e) => e.id)).toEqual(['p0'])
  }, 60_000)
})
