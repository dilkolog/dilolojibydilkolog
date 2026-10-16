import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// An in-memory Blob store, a small fake of Supabase's REST API (PostgREST) and a recording web-push,
// behind the real handlers: friends, shared lists and reminders before and after the move to the tables.
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
  friend_cards: [['sync_id'], ['code']],
  friend_follows: [['sync_id', 'code']],
  shared_lists: [['id']],
  reminders: [['key']],
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
    const row = JSON.parse(String(init.body)) as Row
    const conflict = q.get('on_conflict')?.split(',')
    const same = conflict ? table.find((r) => clash(name, r, row, conflict)) : undefined
    if (same) {
      if (prefer.includes('merge-duplicates')) Object.assign(same, row)
      return new Response(null, { status: 201 })
    }
    if (table.some((r) => clash(name, r, row))) return Response.json({ code: '23505' }, { status: 409 })
    table.push({ ...row })
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
const admin = await import('../../api/admin')
const share = await import('../../api/share')
const push = await import('../../api/push')
const { GET: CRON } = await import('../../api/cron-reminder')
const { clearAccessCache } = await import('../../api/_account')
const { resetRate } = await import('../../api/_rate')
const { forgetTablesFlag } = await import('../../api/_tables')

const ALI = 'a'.repeat(64)
const ALI_TOKEN = '1'.repeat(64)
const VELI = 'b'.repeat(64)
const VELI_TOKEN = '2'.repeat(64)
const APP = { 'sec-fetch-site': 'same-origin' }
const as = (id: string, token: string) => ({ ...APP, 'x-sync-id': id, 'x-sync-auth': token })
const OWNER = { authorization: 'Bearer owner-secret', 'content-type': 'application/json' }
const hex = async (t: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('')
const setBlob = (path: string, value: unknown) => void blobs.set(path, { bytes: new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)), etag: `"b${++blobVersion}"` })

const friendsPost = (who: [string, string], body: unknown) => access.POST(new Request('https://app.test/api/access', { method: 'POST', headers: as(...who), body: JSON.stringify(body) }))
const friendsView = async (who: [string, string]) => (await access.GET(new Request('https://app.test/api/access?friends=1&today=2026-10-15', { headers: as(...who) }))).json() as Promise<{ me: { code: string }; friends: { name: string; week: number }[] }>
const adminPost = (body: unknown) => admin.POST(new Request('https://app.test/api/admin', { method: 'POST', headers: OWNER, body: JSON.stringify(body) }))
const adminState = async () => ((await (await admin.GET(new Request('https://app.test/api/admin', { headers: OWNER }))).json()) as { tables: string }).tables
const words = [{ key: 'fr:maison', word: 'la maison', meaning: 'ev', at: '2026-10-12T10:00:00Z' }]
const card = { name: 'Ali', avatar: 'fox', color: '#2f6de6', streak: 5, level: 6, days: { '2026-10-15': 40, '2026-10-12': 60 }, today: '2026-10-15' }
const ALI_P: [string, string] = [ALI, ALI_TOKEN]
const VELI_P: [string, string] = [VELI, VELI_TOKEN]

beforeEach(async () => {
  blobs.clear()
  sent.length = 0
  reset()
  clearAccessCache()
  resetRate()
  forgetTablesFlag()
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
  vi.useRealTimers()
})

describe('server data in Supabase tables', () => {
  it('stays in Blob until the owner moves it, then everything is copied and read from the tables', async () => {
    expect(await adminState()).toBe('ready')
    // Before the move: a friend card, a follow, a published set, a push subscription and a mail address in Blob.
    const { me } = (await (await friendsPost(ALI_P, { action: 'friends-publish', ...card })).json()) as { me: { code: string } }
    expect((await friendsPost(VELI_P, { action: 'friends-add', code: me.code })).status).toBe(200)
    const made = await share.POST(new Request('https://app.test/api/share', { method: 'POST', headers: as(...ALI_P), body: JSON.stringify({ kind: 'set', name: 'Ev', language: 'fr', words, publish: true, by: 'ali' }) }))
    const { id } = (await made.json()) as { id: string }
    await push.POST(new Request('https://app.test/api/push', { method: 'POST', body: JSON.stringify({ action: 'save', subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/1', keys: { p256dh: 'p', auth: 'a' } }, tz: 0, hour: 9 }) }))
    setBlob(`push/mail-${'c'.repeat(40)}.json`, { email: 'ali@example.com', owner: ALI, confirmed: true, token: 't', tz: 0, studiedDay: null, streak: 0, plan: '', group: ALI })
    expect(tables.friend_cards).toEqual([])
    expect([...blobs.keys()].filter((k) => k.startsWith('friends/') || k.startsWith('share/') || k.startsWith('push/')).length).toBeGreaterThanOrEqual(7)

    const moved = await adminPost({ action: 'move-tables' })
    expect(await moved.json()).toMatchObject({ ok: true, shares: 1, reminders: 2 })
    expect(await adminState()).toBe('on')
    expect(tables.friend_cards).toContainEqual(expect.objectContaining({ sync_id: ALI, code: me.code, name: 'Ali', streak: 5 }))
    expect(tables.shared_lists).toEqual([expect.objectContaining({ id, published: true, published_by: 'ali', word_count: 1 })])
    expect(tables.reminders!.map((r) => r.kind).sort()).toEqual(['mail', 'push'])
    // Run again: nothing doubles.
    await adminPost({ action: 'move-tables' })
    expect([tables.shared_lists.length, tables.reminders!.length]).toEqual([1, 2])

    // After: the friend still sees Ali, the set still opens and is in the library, without Blob.
    for (const key of [...blobs.keys()]) if (/^(friends|share|push)\//.test(key)) blobs.delete(key)
    expect((await friendsView(VELI_P)).friends).toEqual([expect.objectContaining({ name: 'Ali', week: 100 })])
    expect((await share.GET(new Request(`https://app.test/api/share?id=${id}`))).status).toBe(200)
    const lib = (await (await share.GET(new Request('https://app.test/api/share?library=1&language=fr', { headers: as(...VELI_P) }))).json()) as { items: { id: string; by?: string; count: number }[] }
    expect(lib.items).toEqual([expect.objectContaining({ id, by: 'ali', count: 1 })])
  })

  it('after the move, friends, collaborative lists and reminders are written to the tables', async () => {
    await adminPost({ action: 'move-tables' })

    // Friends.
    const { me } = (await (await friendsPost(ALI_P, { action: 'friends-publish', ...card })).json()) as { me: { code: string } }
    expect(tables.friend_cards).toHaveLength(1)
    expect(await (await friendsPost(VELI_P, { action: 'friends-add', code: me.code })).json()).toEqual({ ok: true })
    expect(tables.friend_follows).toContainEqual(expect.objectContaining({ sync_id: VELI, code: me.code }))
    expect(await (await friendsPost(ALI_P, { action: 'friends-add', code: me.code })).json()).toMatchObject({ error: 'self' })
    await friendsPost(VELI_P, { action: 'friends-remove', code: me.code })
    expect(tables.friend_follows).toEqual([])

    // A collaborative list: the version is the ETag; a stale one, or a Blob tag from before the move, is refused.
    const made = await share.POST(new Request('https://app.test/api/share', { method: 'POST', headers: as(...ALI_P), body: JSON.stringify({ kind: 'collab', name: 'Birlikte', language: 'fr', words }) }))
    const { id } = (await made.json()) as { id: string }
    const read = await share.GET(new Request(`https://app.test/api/share?id=${id}`))
    const etag = read.headers.get('etag')!
    expect(etag).toBe('"v1"')
    const put = (tag: string) => share.PUT(new Request(`https://app.test/api/share?id=${id}`, { method: 'PUT', headers: { ...as(...VELI_P), 'if-match': tag }, body: JSON.stringify({ words: [...words, { key: 'fr:chat', word: 'le chat', meaning: 'kedi', at: '2026-10-13T10:00:00Z' }] }) }))
    expect((await put(etag)).status).toBe(204)
    expect((await put(etag)).status).toBe(412)
    expect((await put('"b7"')).status).toBe(412)
    expect(tables.shared_lists![0]).toMatchObject({ version: 2, word_count: 2 })
    expect((await share.DELETE(new Request(`https://app.test/api/share?id=${id}`, { method: 'DELETE', headers: as(...VELI_P) }))).status).toBe(403)
    expect((await share.DELETE(new Request(`https://app.test/api/share?id=${id}`, { method: 'DELETE', headers: as(...ALI_P) }))).status).toBe(204)
    expect(tables.shared_lists).toEqual([])

    // A push subscription: saved, reminded by the cron at its hour, removed.
    vi.stubEnv('VAPID_PRIVATE_KEY', 'k')
    vi.stubEnv('CRON_SECRET', 's')
    const endpoint = 'https://fcm.googleapis.com/fcm/send/2'
    await push.POST(new Request('https://app.test/api/push', { method: 'POST', body: JSON.stringify({ action: 'save', subscription: { endpoint, keys: { p256dh: 'p', auth: 'a' } }, tz: 0, hour: 9 }) }))
    expect(tables.reminders).toEqual([expect.objectContaining({ kind: 'push', key: await push.pushKey(endpoint) })])
    expect([...blobs.keys()].some((k) => k.startsWith('push/'))).toBe(false)
    expect(await (await CRON(new Request('https://app.test/api/cron-reminder?h=9', { headers: { authorization: 'Bearer s' } }))).json()).toMatchObject({ devices: 1, sent: 1 })
    expect(sent).toEqual([endpoint])
    await push.POST(new Request('https://app.test/api/push', { method: 'POST', body: JSON.stringify({ action: 'remove', endpoint }) }))
    expect(tables.reminders).toEqual([])
  })

  it('a mail confirmation link and an account deletion reach the tables', async () => {
    await adminPost({ action: 'move-tables' })
    const key = 'd'.repeat(40)
    tables.reminders!.push({ key: `mail-${key}`, kind: 'mail', owner: ALI, email: 'ali@example.com', confirmed: false, record: { email: 'ali@example.com', owner: ALI, token: 'e'.repeat(24), tz: 0, studiedDay: null, streak: 0, plan: '', group: ALI } })
    const page = await push.GET(new Request(`https://app.test/api/push?c=${key}.${'e'.repeat(24)}`))
    expect(page.status).toBe(200)
    expect((tables.reminders![0]!.record as { confirmed?: boolean }).confirmed).toBe(true)

    await friendsPost(ALI_P, { action: 'friends-publish', ...card })
    await friendsPost(VELI_P, { action: 'friends-publish', ...card, name: 'Veli' })
    const { deleteAccountData } = await import('../../api/_deleteAccount')
    await deleteAccountData(ALI)
    expect(tables.reminders).toEqual([])
    expect(tables.friend_cards!.map((r) => r.sync_id)).toEqual([VELI])
  })

  it('without 0003 the move is refused and Blob stays in use', async () => {
    reset(false)
    expect(await adminState()).toBe('missing')
    expect((await adminPost({ action: 'move-tables' })).status).toBe(409)
    expect((await friendsPost(ALI_P, { action: 'friends-publish', ...card })).status).toBe(200)
    expect(blobs.has(`friends/card/${ALI}.json`)).toBe(true)
  })
})
