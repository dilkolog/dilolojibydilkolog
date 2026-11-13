import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PartStore } from './sync'

const { syncNow, referencedMedia } = await import('./sync')
const { KelimeDB } = await import('./db')
const { createEntry } = await import('./wordInput')

/** An in-memory store like the Supabase one: versioned parts, media files with a write time, listing and removal. */
function memoryStore(): PartStore & { files: Map<string, { bytes: Uint8Array; at: number }>; removed: string[] } {
  const files = new Map<string, { bytes: Uint8Array; at: number }>()
  const versions = new Map<string, number>()
  const removed: string[] = []
  return {
    kind: 'supabase',
    files,
    removed,
    async fetch(part) {
      const f = files.get(part)
      return f ? { bytes: f.bytes.slice() as never, etag: String(versions.get(part) ?? 0) } : null
    },
    async put(part, data, opts = {}) {
      const v = versions.get(part)
      if (opts.createOnly && v !== undefined) throw Object.assign(new Error('exists'), { name: 'SyncConflictError' })
      if (opts.ifMatch && String(v) !== opts.ifMatch) throw Object.assign(new Error('changed'), { name: 'SyncConflictError' })
      files.set(part, { bytes: new Uint8Array(data), at: Date.now() })
      versions.set(part, (v ?? 0) + 1)
      return data.length
    },
    async history() {
      return []
    },
    async listMedia() {
      return [...files].filter(([p]) => p.startsWith('m-')).map(([part, f]) => ({ part, at: f.at }))
    },
    async removeMedia(parts) {
      for (const p of parts) {
        files.delete(p)
        removed.push(p)
      }
    },
  }
}

const mediaFiles = (store: ReturnType<typeof memoryStore>) => [...store.files.keys()].filter((p) => p.startsWith('m-'))
const picture = () => new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' })

let n = 0
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-13T09:00:00Z'))
})
afterEach(() => vi.useRealTimers())

describe('pictures nothing names any more', () => {
  it('finds media ids anywhere in the data, never in the media list itself', () => {
    const backup = { vocabulary: [{ imageId: 'a' }], settings: { profile: { photoId: 'b' } }, lists: [{ coverId: 'c' }], mediaIds: ['d'], media: [{ id: 'e' }] }
    expect([...referencedMedia(backup as never, new Set(['a', 'b', 'c', 'd', 'e', 'f']))].sort()).toEqual(['a', 'b', 'c'])
  })

  it('a picture taken off a word on one device leaves the server, is not fetched again elsewhere, and the others stay', async () => {
    const store = memoryStore()
    const phone = new KelimeDB(`t-media-phone-${++n}`)
    const laptop = new KelimeDB(`t-media-laptop-${n}`)
    const keptPic = await phone.addMedia('image', picture())
    const goingPic = await phone.addMedia('image', picture())
    const kept = createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date())
    const going = createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date())
    await phone.vocabulary.bulkPut([{ ...kept, imageId: keptPic }, { ...going, imageId: goingPic }])
    await syncNow(phone, store)
    expect(mediaFiles(store)).toHaveLength(2)
    await syncNow(laptop, store)
    expect(await laptop.media.count()).toBe(2)

    // On the laptop, the picture comes off the word (as the word page does it).
    vi.setSystemTime(new Date('2026-11-13T10:00:00Z'))
    const onLaptop = (await laptop.vocabulary.get(going.id))!
    await laptop.media.delete(goingPic)
    await laptop.vocabulary.put({ ...onLaptop, imageId: undefined, updatedAt: new Date().toISOString() })
    await syncNow(laptop, store)
    expect(mediaFiles(store)).toHaveLength(1)
    expect(store.removed).toHaveLength(1)

    // The phone still has its own copy; it does not send it up again, and the kept picture is untouched.
    await syncNow(phone, store)
    expect(mediaFiles(store)).toHaveLength(1)
    expect((await phone.vocabulary.get(going.id))?.imageId).toBeUndefined()
    expect(await phone.media.get(keptPic)).toBeTruthy()
    // A device deleting it locally no longer gets it back from the server either.
    expect(await laptop.media.get(goingPic)).toBeUndefined()
    await syncNow(laptop, store)
    expect(await laptop.media.get(goingPic)).toBeUndefined()
  })

  it('a stray file no list names goes once it is a day old, not before', async () => {
    const store = memoryStore()
    const phone = new KelimeDB(`t-media-stray-${++n}`)
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await syncNow(phone, store)
    // An upload whose list was never written (a device that stopped half-way), and one just made.
    store.files.set('m-aaaa', { bytes: new Uint8Array([1]), at: Date.now() - 2 * 86_400_000 })
    store.files.set('m-bbbb', { bytes: new Uint8Array([1]), at: Date.now() - 3_600_000 })
    await phone.vocabulary.put(createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date()))
    await syncNow(phone, store)
    expect(mediaFiles(store)).toEqual(['m-bbbb'])
    // Once a day: the next sync the same day does not list again.
    vi.setSystemTime(new Date('2026-11-14T08:00:00Z'))
    await phone.vocabulary.put(createEntry({ word: 'chien', meaning: 'köpek' }, 'fr', new Date()))
    await syncNow(phone, store)
    expect(mediaFiles(store)).toEqual(['m-bbbb'])
    vi.setSystemTime(new Date('2026-11-14T10:00:00Z'))
    await phone.vocabulary.put(createEntry({ word: 'oiseau', meaning: 'kuş' }, 'fr', new Date()))
    await syncNow(phone, store)
    expect(mediaFiles(store)).toEqual([])
  })

  it('a first sync of a device collects nothing (it does not yet know what the others name)', async () => {
    const store = memoryStore()
    const phone = new KelimeDB(`t-media-first-${++n}`)
    store.files.set('m-old', { bytes: new Uint8Array([1]), at: Date.now() - 5 * 86_400_000 })
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await syncNow(phone, store)
    expect(mediaFiles(store)).toEqual(['m-old'])
  })
})
