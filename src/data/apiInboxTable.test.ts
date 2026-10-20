import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The friends' inbox in its table (migration 0004) and, before that, in Blob: an in-memory Blob store and a small
// fake of Supabase's REST API (PostgREST) behind the real handlers.
const blobs = new Map<string, { bytes: Uint8Array; etag: string }>()
let blobVersion = 0
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: string, opts: { allowOverwrite?: boolean; ifMatch?: string }) => {
    const cur = blobs.get(path)
    if (opts.allowOverwrite === false && cur) throw new Error('exists')
    if (opts.ifMatch && cur && cur.etag !== opts.ifMatch) throw Object.assign(new Error('precondition'), { name: 'BlobPreconditionFailedError' })
    blobs.set(path, { bytes: new TextEncoder().encode(body), etag: `"b${++blobVersion}"` })
    return {}
  },
  get: async (path: string) => {
    const b = blobs.get(path)
    return b ? { statusCode: 200, stream: new Response(b.bytes.slice()).body, blob: { etag: b.etag } } : null
  },
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })), hasMore: false }),
  del: async (path: string | string[]) => void (Array.isArray(path) ? path : [path]).forEach((p) => blobs.delete(p)),
}))
const sent: string[] = []
vi.mock('web-push', () => ({ default: { setVapidDetails: () => {}, sendNotification: async (sub: { endpoint: string }) => void sent.push(sub.endpoint) } }))

type Row = Record<string, unknown>
/** Each table's key columns (a clash on any of them is a unique violation, 409). */
const UNIQUE: Record<string, string[][]> = {
  server_flags: [['name']],
  friend_inbox: [['id']],
}
let tables: Record<string, Row[]> = {}
const reset = (withTables = true) => {
  tables = withTables ? Object.fromEntries(Object.keys(UNIQUE).map((t) => [t, []])) : {}
}

function matches(row: Row, q: URLSearchParams): boolean {
  for (const [col, cond] of q) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(col)) continue
    const value = String(row[col])
    if (cond.startsWith('eq.') && value !== cond.slice(3)) return false
    if (cond.startsWith('in.(') && !cond.slice(4, -1).split(',').includes(value)) return false
    if (cond.startsWith('gt.') && !(new Date(value).getTime() > new Date(cond.slice(3)).getTime())) return false
    if (cond.startsWith('lt.') && !(new Date(value).getTime() < new Date(cond.slice(3)).getTime())) return false
  }
  return true
}
const clash = (name: string, a: Row, b: Row, only?: string[]) => (only ? [only] : UNIQUE[name]!).some((cols) => cols.every((c) => a[c] === b[c]))

async function fakeRest(input: string, init: RequestInit = {}): Promise<Response> {
  const url = new URL(input)
  if (!url.pathname.startsWith('/rest/v1/')) return new Response('not found', { status: 404 })
  const name = url.pathname.replace('/rest/v1/', '')
  const table = tables[name]
  if (!table) return Response.json({ code: 'PGRST205' }, { status: 404 })
  const q = url.searchParams
  const prefer = new Headers(init.headers).get('prefer') ?? ''
  const method = init.method ?? 'GET'
  if (method === 'GET') {
    let found = table.filter((r) => matches(r, q))
    const order = q.get('order')
    if (order) {
      const [col, dir] = order.split('.')
      found = [...found].sort((a, b) => String(a[col!]).localeCompare(String(b[col!])) * (dir === 'desc' ? -1 : 1))
    }
    const from = Number(q.get('offset') ?? 0)
    found = found.slice(from, q.has('limit') ? from + Number(q.get('limit')) : undefined)
    return Response.json(found.map((r) => ({ ...r })))
  }
  if (method === 'POST') {
    const body = JSON.parse(String(init.body)) as Row | Row[]
    for (const row of Array.isArray(body) ? body : [body]) {
      const conflict = q.get('on_conflict')?.split(',')
      const same = conflict ? table.find((r) => clash(name, r, row, conflict)) : undefined
      if (same) {
        if (prefer.includes('merge-duplicates')) Object.assign(same, row)
        continue
      }
      if (table.some((r) => clash(name, r, row))) return Response.json({ code: '23505' }, { status: 409 })
      table.push({ ...row })
    }
    return new Response(null, { status: 201 })
  }
  const hit = table.filter((r) => matches(r, q))
  if (method === 'PATCH') {
    const patch = JSON.parse(String(init.body)) as Row
    for (const r of hit) Object.assign(r, patch)
    return prefer.includes('return=representation') ? Response.json(hit) : new Response(null, { status: 204 })
  }
  if (method === 'DELETE') {
    tables[name] = table.filter((r) => !hit.includes(r))
    return new Response(null, { status: 204 })
  }
  return new Response('bad method', { status: 405 })
}

const access = await import('../../api/access')
const { clearAccessCache } = await import('../../api/_account')
const { resetRate } = await import('../../api/_rate')
const { forgetTablesFlag, forgetInboxFlag } = await import('../../api/_tables')
const { forgetLegacyChecks } = await import('../../api/_friends')

const ALI = 'a'.repeat(64)
const ALI_TOKEN = '1'.repeat(64)
const VELI = 'b'.repeat(64)
const VELI_TOKEN = '2'.repeat(64)
const APP = { 'sec-fetch-site': 'same-origin' }
const as = (id: string, token: string) => ({ ...APP, 'x-sync-id': id, 'x-sync-auth': token })
const hex = async (t: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('')
const setBlob = (path: string, value: unknown) => void blobs.set(path, { bytes: new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)), etag: `"b${++blobVersion}"` })
const ALI_P: [string, string] = [ALI, ALI_TOKEN]
const VELI_P: [string, string] = [VELI, VELI_TOKEN]
const post = (who: [string, string], body: unknown) => access.POST(new Request('https://app.test/api/access', { method: 'POST', headers: as(...who), body: JSON.stringify(body) }))
const inbox = async (who: [string, string]) => ((await (await access.GET(new Request('https://app.test/api/access?inbox=1', { headers: as(...who) }))).json()) as { items: { id: string; kind: string; from: { name: string; code: string } }[] }).items
const card = { name: 'Ali', avatar: 'fox', color: '#2f6de6', streak: 5, level: 6, days: {}, today: '2026-10-15' }
const inboxBlob = (id: string) => blobs.has(`friends/inbox/${id}.json`)

let aliCode = ''
let veliCode = ''

async function makeFriends() {
  aliCode = ((await (await post(ALI_P, { action: 'friends-publish', ...card })).json()) as { me: { code: string } }).me.code
  veliCode = ((await (await post(VELI_P, { action: 'friends-publish', ...card, name: 'Veli' })).json()) as { me: { code: string } }).me.code
  expect((await post(VELI_P, { action: 'friends-add', code: aliCode })).status).toBe(200)
}

beforeEach(async () => {
  blobs.clear()
  sent.length = 0
  reset()
  clearAccessCache()
  resetRate()
  forgetTablesFlag()
  forgetInboxFlag()
  forgetLegacyChecks()
  vi.stubEnv('ADMIN_TOKEN', 'owner-secret')
  vi.stubEnv('SUPABASE_URL', 'https://proj.supabase.co')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
  vi.stubGlobal('fetch', (input: string | URL, init?: RequestInit) => fakeRest(String(input), init))
  setBlob(`sync/${ALI}/auth.txt`, await hex(ALI_TOKEN))
  setBlob(`sync/${VELI}/auth.txt`, await hex(VELI_TOKEN))
  setBlob(`access/approved/${ALI}.json`, { username: 'ali', at: '2026-10-10T10:00:00Z' })
  setBlob(`access/approved/${VELI}.json`, { username: 'veli', at: '2026-10-10T10:00:00Z' })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('friends inbox in its table', () => {
  it('before migration 0004 (no flag, or no table) the inbox stays in Blob', async () => {
    await makeFriends()
    expect((await post(ALI_P, { action: 'friends-send', code: veliCode, kind: 'cheer' })).status).toBe(200)
    expect(inboxBlob(VELI)).toBe(true)
    expect(tables.friend_inbox).toEqual([])
    expect(await inbox(VELI_P)).toEqual([expect.objectContaining({ kind: 'cheer' })])
    // No table at all (0004 never run): same.
    reset(false)
    forgetInboxFlag()
    expect(await inbox(VELI_P)).toEqual([expect.objectContaining({ kind: 'cheer' })])
  })

  it('with the flag on, messages are rows: sent, read, replaced and cleared there, and no Blob inbox is written', async () => {
    tables.server_flags!.push({ name: 'inbox', value: true })
    await makeFriends()
    expect((await post(ALI_P, { action: 'friends-send', code: veliCode, kind: 'cheer' })).status).toBe(200)
    expect((await post(ALI_P, { action: 'friends-send', code: veliCode, kind: 'cheer' })).status).toBe(200)
    expect(inboxBlob(VELI)).toBe(false)
    expect(tables.friend_inbox).toHaveLength(1)
    expect(tables.friend_inbox![0]).toMatchObject({ sync_id: VELI, kind: 'cheer', from_name: 'Ali', from_code: aliCode })
    const items = await inbox(VELI_P)
    expect(items).toEqual([expect.objectContaining({ kind: 'cheer', from: { code: aliCode, name: 'Ali' } })])
    expect(JSON.stringify(items)).not.toContain(ALI)
    await post(VELI_P, { action: 'friends-inbox-clear', ids: [items[0]!.id] })
    expect(tables.friend_inbox).toEqual([])
  })

  it('a gift and a text travel with their content; sends made at the same moment are all kept', async () => {
    tables.server_flags!.push({ name: 'inbox', value: true })
    await makeFriends()
    const gift = { language: 'fr', lemma: 'la maison', meaning: 'ev', example: 'La maison est grande.', exampleTranslation: 'Ev büyük.' }
    const text = { language: 'fr', title: 'Un jour', body: 'Chaque matin, nous marchons ensemble près de la maison. Ensuite nous rentrons.' }
    const results = await Promise.all([
      post(ALI_P, { action: 'friends-send', code: veliCode, kind: 'gift', payload: gift }),
      post(ALI_P, { action: 'friends-send', code: veliCode, kind: 'text', payload: text }),
      post(ALI_P, { action: 'friends-send', code: veliCode, kind: 'cheer' }),
    ])
    expect(results.map((r) => r.status)).toEqual([200, 200, 200])
    const items = (await inbox(VELI_P)) as unknown as { kind: string; gift?: unknown; text?: { title: string } }[]
    expect(items.map((i) => i.kind).sort()).toEqual(['cheer', 'gift', 'text'])
    expect(items.find((i) => i.kind === 'gift')!.gift).toEqual(gift)
    expect(items.find((i) => i.kind === 'text')!.text!.title).toBe('Un jour')
  })

  it('what was waiting in a Blob inbox is carried over: read as before, moved into the table by the next change, the file removed', async () => {
    await makeFriends()
    await post(ALI_P, { action: 'friends-send', code: veliCode, kind: 'cheer' })
    expect(inboxBlob(VELI)).toBe(true)
    // 0004 is run now.
    tables.server_flags!.push({ name: 'inbox', value: true })
    forgetInboxFlag()
    const before = await inbox(VELI_P)
    expect(before.map((i) => i.kind)).toEqual(['cheer'])
    // A new message arrives: both are there, the old one now in the table, the Blob file gone.
    await post(ALI_P, { action: 'friends-send', code: veliCode, kind: 'nudge', today: '2026-10-15' })
    const after = await inbox(VELI_P)
    expect(after.map((i) => i.kind).sort()).toEqual(['cheer', 'nudge'])
    expect(tables.friend_inbox).toHaveLength(2)
    expect(inboxBlob(VELI)).toBe(false)
  })

  it('a message past its days is not read and is swept away by the next change', async () => {
    tables.server_flags!.push({ name: 'inbox', value: true })
    await makeFriends()
    tables.friend_inbox!.push({ id: 'old', sync_id: VELI, kind: 'cheer', from_code: aliCode, from_name: 'Ali', gift: null, sent_text: null, at: new Date(Date.now() - 40 * 86_400_000).toISOString() })
    expect(await inbox(VELI_P)).toEqual([])
    await post(ALI_P, { action: 'friends-send', code: veliCode, kind: 'cheer' })
    await new Promise((r) => setTimeout(r, 10))
    expect(tables.friend_inbox!.map((r) => r.id)).not.toContain('old')
  })

  it('deleting the account takes its messages out of the table', async () => {
    tables.server_flags!.push({ name: 'inbox', value: true })
    await makeFriends()
    await post(ALI_P, { action: 'friends-send', code: veliCode, kind: 'cheer' })
    expect(tables.friend_inbox).toHaveLength(1)
    const { forgetFriends } = await import('../../api/_friends')
    await forgetFriends(VELI)
    expect(tables.friend_inbox).toEqual([])
  })
})
