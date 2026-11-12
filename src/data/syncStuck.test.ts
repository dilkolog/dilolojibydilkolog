import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { syncNow, SyncConflictError, SYNC_ATTEMPTS, type PartStore } from './sync'
import { KelimeDB } from './db'
import { createEntry } from './wordInput'

/** A store with Supabase's rules (put_sync_part): integer versions, create-only, if-match, refusals as conflicts. */
function versionedStore() {
  const rows = new Map<string, { bytes: Uint8Array<ArrayBuffer>; version: number }>()
  const writes: string[] = []
  /** Reads of a part that miss it once (as a stale read would), by name. */
  const missOnce = new Set<string>()
  /** Parts every write of is refused. */
  const refuse = new Set<string>()
  const store: PartStore = {
    kind: 'supabase',
    async fetch(part) {
      if (missOnce.delete(part)) return null
      const r = rows.get(part)
      return r ? { bytes: r.bytes.slice() as Uint8Array<ArrayBuffer>, etag: String(r.version) } : null
    },
    async put(part, data, opts = {}) {
      const r = rows.get(part)
      const mode = opts.createOnly ? 'create' : opts.ifMatch ? 'match' : 'any'
      if (refuse.has(part) || (opts.createOnly && r) || (opts.ifMatch && r?.version !== Number(opts.ifMatch))) throw new SyncConflictError('changed meanwhile', part, mode)
      rows.set(part, { bytes: data.slice() as Uint8Array<ArrayBuffer>, version: (r?.version ?? 0) + 1 })
      writes.push(part)
      return data.length
    },
    async history() {
      return []
    },
  }
  return { store, rows, writes, missOnce, refuse }
}

const answer = (id: string, entryId: string, at: string) =>
  ({ id, entryId, language: 'fr', skill: 'recognition', exerciseType: 'mc_meaning', direction: 'l2_to_l1', verdict: 'correct', correct: true, rating: 3, responseMs: 1000, hintsUsed: 0, retrievabilityBefore: 0.9, stabilityAfter: 3, scheduledDays: 1, mode: 'normal', timestamp: new Date(at) }) as never

async function device(name: string) {
  const db = new KelimeDB(name)
  const word = createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date())
  await db.vocabulary.put(word)
  await db.events.put(answer(`${name}-1`, word.id, '2026-11-05T10:00:00Z'))
  return { db, word }
}

describe('a sync that a part keeps refusing', () => {
  it('the month of answers grows with each sync', async () => {
    const { store, rows } = versionedStore()
    const { db, word } = await device('t-stuck-grow')
    await syncNow(db, store)
    await db.events.put(answer('n-2', word.id, '2026-11-12T20:20:00Z'))
    await syncNow(db, store)
    expect(rows.get('ev-2026-11')?.version).toBe(2)
  })

  it('a part read as missing, then refused, is read again and written against its version', async () => {
    const { store, rows, missOnce } = versionedStore()
    const { db, word } = await device('t-stuck-miss')
    await syncNow(db, store)
    await db.events.put(answer('m-2', word.id, '2026-11-12T20:20:00Z'))
    // The next read of the month misses the row the server holds: the write is "create" and refused.
    missOnce.add('ev-2026-11')
    await syncNow(db, store)
    expect(rows.get('ev-2026-11')?.version).toBe(2)
    expect(rows.get('core')?.version).toBe(2)
  })

  it('a part refused on every try says which, and how, instead of only "conflict"', async () => {
    const { store, refuse, writes } = versionedStore()
    const { db, word } = await device('t-stuck-refused')
    await syncNow(db, store)
    await db.events.put(answer('r-2', word.id, '2026-11-12T20:20:00Z'))
    refuse.add('ev-2026-11')
    writes.length = 0
    const e = await syncNow(db, store).catch((x: unknown) => x)
    expect(e).toBeInstanceOf(SyncConflictError)
    expect((e as SyncConflictError).part).toBe('ev-2026-11')
    expect((e as SyncConflictError).message).toMatch(/ev-2026-11 \(match\)/)
    // The core is never written past a refused part (its list would name a part the server does not hold).
    expect(writes).not.toContain('core')
    expect(SYNC_ATTEMPTS).toBeGreaterThanOrEqual(3)
  })
})
