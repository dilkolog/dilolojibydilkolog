import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

// The old store: an in-memory Blob behind the real /api/sync.
const blobs = new Map<string, { bytes: Uint8Array; etag: string }>()
let blobVersion = 0
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: ArrayBuffer | string, opts: { allowOverwrite?: boolean; ifMatch?: string }) => {
    if (opts.allowOverwrite === false && blobs.has(path)) throw Object.assign(new Error('Precondition failed'), { name: 'BlobPreconditionFailedError' })
    if (opts.ifMatch && blobs.get(path)?.etag !== opts.ifMatch) throw Object.assign(new Error('precondition'), { name: 'BlobPreconditionFailedError' })
    blobs.set(path, { bytes: typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body), etag: `"v${++blobVersion}"` })
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
const { deriveAccount, syncNow, SyncConflictError, SyncApprovalError, SyncMovedError } = await import('./sync')
const { supabaseStore, probeStore } = await import('./supabaseStore')
const { moveToSupabase } = await import('../ui/syncData')
const { KelimeDB } = await import('./db')
const { createEntry } = await import('./wordInput')

/**
 * A small Supabase: the `sync_parts` rows (what put_sync_part does, with its version check and the
 * day's restore point), the "media" bucket, and a switch for the owner's approval.
 */
function fakeSupabase(opts: { tables?: boolean } = {}) {
  const rows = new Map<string, { data: unknown; version: number }>()
  const files = new Map<string, Blob>()
  const state = { approved: true, beforeCorePut: null as null | (() => Promise<void>), corePuts: 0 }
  const missing = { code: 'PGRST205', message: 'Could not find the table' }
  const query = (table: string) => {
    const filters: [string, string, string][] = []
    let desc = false
    const result = () => {
      if (opts.tables === false) return { data: null, error: missing }
      const out = [...rows.entries()]
        .map(([name, r]) => ({ name, ...r }))
        .filter((r) => filters.every(([col, op, v]) => (col === 'user_id' ? true : op === 'eq' ? r.name === v : r.name.startsWith(v.replace('%', '')))))
        .sort((a, b) => (desc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)))
      return { data: out, error: null }
    }
    const builder = {
      select: () => builder,
      eq: (col: string, v: string) => (filters.push([col, 'eq', v]), builder),
      like: (col: string, v: string) => (filters.push([col, 'like', v]), builder),
      order: (_c: string, o: { ascending: boolean }) => ((desc = !o.ascending), builder),
      maybeSingle: async () => {
        const r = result()
        return r.error ? r : { data: r.data![0] ?? null, error: null }
      },
      then: (resolve: (v: unknown) => void) => resolve(result()),
    }
    void table
    return builder
  }
  const client = {
    from: query,
    rpc: async (_fn: string, a: { p_name: string; p_data: unknown; p_expect: number | null; p_create: boolean }) => {
      if (!state.approved) return { error: { code: '42501', message: 'approval required' } }
      if (a.p_name === 'core') {
        state.corePuts++
        const hook = state.beforeCorePut
        state.beforeCorePut = null
        await hook?.()
      }
      const was = rows.get(a.p_name)
      if (a.p_create && was) return { error: { code: '40001', message: 'conflict' } }
      if (a.p_expect !== null && was?.version !== a.p_expect) return { error: { code: '40001', message: 'conflict' } }
      rows.set(a.p_name, { data: JSON.parse(JSON.stringify(a.p_data)), version: (was?.version ?? 0) + 1 })
      if (a.p_name === 'core' && !rows.has('h-2026-10-05')) rows.set('h-2026-10-05', { data: a.p_data, version: 1 })
      return { data: rows.get(a.p_name)!.version, error: null }
    },
    storage: {
      from: () => ({
        download: async (path: string) => (files.has(path) ? { data: files.get(path)!, error: null } : { data: null, error: { message: 'not found' } }),
        upload: async (path: string, blob: Blob) => (files.set(path, blob), { error: null }),
      }),
    },
  }
  return { client: client as unknown as SupabaseClient, rows, files, state }
}

const USER = '11111111-1111-1111-1111-111111111111'
const lemmas = async (db: InstanceType<typeof KelimeDB>) => (await db.vocabulary.toArray()).map((v) => v.lemma).sort()

beforeEach(() => {
  blobs.clear()
  clearAccessCache()
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

describe('syncing through Supabase', () => {
  it('two devices meet there; the data is plain JSON in rows, with a restore point of the day', async () => {
    const sb = fakeSupabase()
    const store = supabaseStore(sb.client, USER)
    const phone = new KelimeDB('t-sb-phone')
    const laptop = new KelimeDB('t-sb-laptop')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await syncNow(phone, store)
    await laptop.vocabulary.put(createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date()))
    await syncNow(laptop, store)
    await syncNow(phone, store)
    expect(await lemmas(phone)).toEqual(['chat', 'maison'])
    expect(await lemmas(laptop)).toEqual(['chat', 'maison'])
    const core = sb.rows.get('core')!.data as { vocabulary: { lemma: string }[] }
    expect(core.vocabulary.map((v) => v.lemma).sort()).toEqual(['chat', 'maison'])
    expect(await store.history()).toEqual(['2026-10-05'])
    expect(await probeStore(sb.client, USER)).toBe('ready')
  }, 60_000)

  it('the one that loses the race on the core merges again', async () => {
    const sb = fakeSupabase()
    const store = supabaseStore(sb.client, USER)
    const phone = new KelimeDB('t-sb-race-phone')
    const laptop = new KelimeDB('t-sb-race-laptop')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await syncNow(phone, store)
    await syncNow(laptop, store)
    await phone.vocabulary.put(createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date()))
    await laptop.vocabulary.put(createEntry({ word: 'chien', meaning: 'köpek' }, 'fr', new Date()))
    sb.state.beforeCorePut = async () => void (await syncNow(phone, store))
    sb.state.corePuts = 0
    await syncNow(laptop, store)
    expect(sb.state.corePuts).toBeGreaterThanOrEqual(3)
    expect(await lemmas(laptop)).toEqual(['chat', 'chien', 'maison'])
  }, 60_000)

  it('says when the tables are not set up, and refuses writes before approval', async () => {
    expect(await probeStore(fakeSupabase({ tables: false }).client, USER)).toBe('missing')
    const sb = fakeSupabase()
    expect(await probeStore(sb.client, USER)).toBe('empty')
    sb.state.approved = false
    const phone = new KelimeDB('t-sb-unapproved')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    await expect(syncNow(phone, supabaseStore(sb.client, USER))).rejects.toBeInstanceOf(SyncApprovalError)
  }, 60_000)

  it('a write against an old version is a conflict', async () => {
    const sb = fakeSupabase()
    const store = supabaseStore(sb.client, USER)
    const data = new TextEncoder().encode('{"a":1}') as Uint8Array<ArrayBuffer>
    await store.put('ev-2026-10', data, { createOnly: true })
    await expect(store.put('ev-2026-10', data, { createOnly: true })).rejects.toBeInstanceOf(SyncConflictError)
    await expect(store.put('ev-2026-10', data, { ifMatch: '7' })).rejects.toBeInstanceOf(SyncConflictError)
    expect(await store.put('ev-2026-10', data, { ifMatch: '1' })).toBe(data.length)
  })
})

describe('moving from the old store', () => {
  it('brings the other devices\' last changes along, then stops a device still signed in the old way', async () => {
    const acc = await deriveAccount('ali', 'correct horse')
    blobs.set(`access/approved/${acc.id}.json`, { bytes: new TextEncoder().encode('{}'), etag: '"a"' })
    const phone = new KelimeDB('t-move-phone')
    const laptop = new KelimeDB('t-move-laptop')
    // The laptop's last word reached only the old store.
    await laptop.vocabulary.put(createEntry({ word: 'chien', meaning: 'köpek' }, 'fr', new Date()))
    await syncNow(laptop, acc)
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))

    const sb = fakeSupabase()
    const store = supabaseStore(sb.client, USER)
    expect(await moveToSupabase(phone, acc, store)).toBe(true)
    const core = sb.rows.get('core')!.data as { vocabulary: { lemma: string }[] }
    expect(core.vocabulary.map((v) => v.lemma).sort()).toEqual(['chien', 'maison'])
    // The laptop, still on the old sign-in, is told instead of writing beside the new store.
    await expect(syncNow(laptop, acc)).rejects.toBeInstanceOf(SyncMovedError)
  }, 60_000)

  it('waits when Supabase does not know the approval yet, and keeps the old store working', async () => {
    const acc = await deriveAccount('veli', 'correct horse')
    blobs.set(`access/approved/${acc.id}.json`, { bytes: new TextEncoder().encode('{}'), etag: '"a"' })
    const phone = new KelimeDB('t-move-wait')
    await phone.vocabulary.put(createEntry({ word: 'maison', meaning: 'ev' }, 'fr', new Date()))
    const sb = fakeSupabase()
    sb.state.approved = false
    expect(await moveToSupabase(phone, acc, supabaseStore(sb.client, USER))).toBe(false)
    await expect(syncNow(phone, acc)).resolves.toBeTruthy()
  }, 60_000)
})
