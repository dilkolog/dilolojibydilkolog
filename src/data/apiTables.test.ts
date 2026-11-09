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
  // Paged like R2: `limit` files at a time, the cursor is where the next page starts.
  list: async ({ prefix, cursor, limit }: { prefix: string; cursor?: string; limit?: number }) => {
    const all = [...blobs.keys()].filter((k) => k.startsWith(prefix)).sort()
    const from = Number(cursor ?? 0)
    const to = limit ? from + limit : all.length
    return { blobs: all.slice(from, to).map((pathname) => ({ pathname })), hasMore: to < all.length, cursor: to < all.length ? String(to) : undefined }
  },
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
    const body = JSON.parse(String(init.body)) as Row | Row[]
    const conflict = q.get('on_conflict')?.split(',')
    // An array is one statement: a unique violation anywhere fails the whole insert.
    for (const row of Array.isArray(body) ? body : [body]) {
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
type Step = { copied: number; next: unknown; at: string; wait?: number }
const moveStep = async (from?: unknown) => (await (await adminPost({ action: 'move-tables', ...(from ? { from } : {}) })).json()) as Step
/** As if SETTLE_MS had passed since the move started (and every instance had read the flag again). */
const settle = () => {
  const f = tables.server_flags!.find((r) => r.name === 'tables-moving')
  if (f) f.value = { at: new Date(Date.now() - 60_000).toISOString() }
  forgetTablesFlag()
}
/** The admin screen's loop: steps until `next` is null; gives how many records were copied. */
async function moveAll(): Promise<number> {
  let from: unknown
  let copied = 0
  for (let i = 0; i < 100; i++) {
    const step = await moveStep(from)
    copied += step.copied
    if (step.wait) settle()
    if (step.next === null) return copied
    from = step.next
  }
  throw new Error('the move did not finish')
}
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
    await push.POST(new Request('https://app.test/api/push', { method: 'POST', headers: as(...ALI_P), body: JSON.stringify({ action: 'save', subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/1', keys: { p256dh: 'p', auth: 'a' } }, tz: 0, hour: 9 }) }))
    setBlob(`push/mail-${'c'.repeat(40)}.json`, { email: 'ali@example.com', owner: ALI, confirmed: true, token: 't', tz: 0, studiedDay: null, streak: 0, plan: '', group: ALI })
    expect(tables.friend_cards).toEqual([])
    expect([...blobs.keys()].filter((k) => k.startsWith('friends/') || k.startsWith('share/') || k.startsWith('push/')).length).toBeGreaterThanOrEqual(7)

    // Two cards (adding a friend gives Veli one too), two follows (a friendship goes both ways), a list, two reminders.
    expect(await moveAll()).toBe(7)
    expect([tables.friend_cards!.length, tables.friend_follows!.length]).toEqual([2, 2])
    expect(await adminState()).toBe('on')
    expect(tables.friend_cards).toContainEqual(expect.objectContaining({ sync_id: ALI, code: me.code, name: 'Ali', streak: 5 }))
    expect(tables.shared_lists).toEqual([expect.objectContaining({ id, published: true, published_by: 'ali', word_count: 1 })])
    expect(tables.reminders!.map((r) => r.kind).sort()).toEqual(['mail', 'push'])
    // Run again: nothing doubles.
    await moveAll()
    expect([tables.shared_lists.length, tables.reminders!.length]).toEqual([1, 2])

    // After: the friend still sees Ali, the set still opens and is in the library, without Blob.
    for (const key of [...blobs.keys()]) if (/^(friends|share|push)\//.test(key)) blobs.delete(key)
    expect((await friendsView(VELI_P)).friends).toEqual([expect.objectContaining({ name: 'Ali', week: 100 })])
    expect((await share.GET(new Request(`https://app.test/api/share?id=${id}`))).status).toBe(200)
    const lib = (await (await share.GET(new Request('https://app.test/api/share?library=1&language=fr', { headers: as(...VELI_P) }))).json()) as { items: { id: string; by?: string; count: number }[] }
    expect(lib.items).toEqual([expect.objectContaining({ id, by: 'ali', count: 1 })])
  })

  it('after the move, friends, collaborative lists and reminders are written to the tables', async () => {
    await moveAll()

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
    await push.POST(new Request('https://app.test/api/push', { method: 'POST', headers: as(...ALI_P), body: JSON.stringify({ action: 'save', subscription: { endpoint, keys: { p256dh: 'p', auth: 'a' } }, tz: 0, hour: 9 }) }))
    expect(tables.reminders).toEqual([expect.objectContaining({ kind: 'push', key: await push.pushKey(endpoint) })])
    expect([...blobs.keys()].some((k) => k.startsWith('push/'))).toBe(false)
    expect(await (await CRON(new Request('https://app.test/api/cron-reminder?h=9', { headers: { authorization: 'Bearer s' } }))).json()).toMatchObject({ devices: 1, sent: 1 })
    expect(sent).toEqual([endpoint])
    await push.POST(new Request('https://app.test/api/push', { method: 'POST', body: JSON.stringify({ action: 'remove', endpoint }) }))
    expect(tables.reminders).toEqual([])
  })

  it('a mail confirmation link and an account deletion reach the tables', async () => {
    await moveAll()
    const key = 'd'.repeat(40)
    tables.reminders!.push({ key: `mail-${key}`, kind: 'mail', owner: ALI, email: 'ali@example.com', confirmed: false, record: { email: 'ali@example.com', owner: ALI, token: 'e'.repeat(24), tz: 0, studiedDay: null, streak: 0, plan: '', group: ALI } })
    // The link only shows a button; the button's POST confirms.
    const page = await push.GET(new Request(`https://app.test/api/push?c=${key}.${'e'.repeat(24)}`))
    expect(page.status).toBe(200)
    expect((tables.reminders![0]!.record as { confirmed?: boolean }).confirmed).toBeUndefined()
    expect((await push.POST(new Request(`https://app.test/api/push?c=${key}.${'e'.repeat(24)}`, { method: 'POST' }))).status).toBe(200)
    expect((tables.reminders![0]!.record as { confirmed?: boolean }).confirmed).toBe(true)

    await friendsPost(ALI_P, { action: 'friends-publish', ...card })
    await friendsPost(VELI_P, { action: 'friends-publish', ...card, name: 'Veli' })
    const { deleteAccountData } = await import('../../api/_deleteAccount')
    await deleteAccountData(ALI)
    expect(tables.reminders).toEqual([])
    expect(tables.friend_cards!.map((r) => r.sync_id)).toEqual([VELI])
  })

  it('a move starts by waiting: nothing is copied until every instance writes to the tables', async () => {
    const { me } = (await (await friendsPost(ALI_P, { action: 'friends-publish', ...card })).json()) as { me: { code: string } }
    expect(me.code).toBeTruthy()
    const first = await moveStep()
    expect(first).toMatchObject({ copied: 0, next: { prefix: 0 } })
    expect(first.wait).toBeGreaterThan(0)
    expect(await adminState()).toBe('moving')
    // Too soon: still waiting, still nothing copied.
    expect(await moveStep(first.next)).toMatchObject({ copied: 0, wait: expect.any(Number) })
    expect(tables.friend_cards).toEqual([])
    settle()
    expect(await moveStep(first.next)).toMatchObject({ copied: 1, at: 'friends/card/' })
    expect(tables.friend_cards).toHaveLength(1)
  })

  it('a move cut short loses nothing: reads find what is not copied yet, writes and removals reach both places', async () => {
    vi.stubEnv('VAPID_PRIVATE_KEY', 'k')
    vi.stubEnv('CRON_SECRET', 's')
    // Before: Ali's card, the friendship, a published list, a collaborative list and a push subscription, in R2.
    const { me } = (await (await friendsPost(ALI_P, { action: 'friends-publish', ...card })).json()) as { me: { code: string } }
    await friendsPost(VELI_P, { action: 'friends-add', code: me.code })
    const post = (body: unknown) => share.POST(new Request('https://app.test/api/share', { method: 'POST', headers: as(...ALI_P), body: JSON.stringify(body) }))
    const { id: setId } = (await (await post({ kind: 'set', name: 'Ev', language: 'fr', words, publish: true, by: 'ali' })).json()) as { id: string }
    const { id: collabId } = (await (await post({ kind: 'collab', name: 'Birlikte', language: 'fr', words })).json()) as { id: string }
    const endpoint = 'https://fcm.googleapis.com/fcm/send/3'
    await push.POST(new Request('https://app.test/api/push', { method: 'POST', headers: as(...ALI_P), body: JSON.stringify({ action: 'save', subscription: { endpoint, keys: { p256dh: 'p', auth: 'a' } }, tz: 0, hour: 9 }) }))

    // The move starts and copies only the cards, then stops (a closed tab, a lost connection).
    const first = await moveStep()
    settle()
    expect((await moveStep(first.next)).at).toBe('friends/card/')
    expect([tables.friend_cards!.length, tables.friend_follows!.length, tables.shared_lists!.length, tables.reminders!.length]).toEqual([2, 0, 0, 0])

    // Reads: the friendship (in R2 only) is there, the lists open, the library shows the set, the cron reminds.
    expect((await friendsView(VELI_P)).friends).toEqual([expect.objectContaining({ name: 'Ali' })])
    expect((await share.GET(new Request(`https://app.test/api/share?id=${setId}`))).status).toBe(200)
    const lib = (await (await share.GET(new Request('https://app.test/api/share?library=1&language=fr', { headers: as(...VELI_P) }))).json()) as { items: { id: string }[] }
    expect(lib.items.map((i) => i.id)).toEqual([setId])
    expect(await (await CRON(new Request('https://app.test/api/cron-reminder?h=9', { headers: { authorization: 'Bearer s' } }))).json()).toMatchObject({ devices: 1, sent: 1 })

    // A collaborative list still in R2 moves to the table on its first change; the R2 tag is honoured once.
    const read = await share.GET(new Request(`https://app.test/api/share?id=${collabId}`))
    const oldTag = read.headers.get('etag')!
    const change = (tag: string) => share.PUT(new Request(`https://app.test/api/share?id=${collabId}`, { method: 'PUT', headers: { ...as(...VELI_P), 'if-match': tag }, body: JSON.stringify({ words: [...words, { key: 'fr:chat', word: 'le chat', meaning: 'kedi', at: '2026-10-13T10:00:00Z' }] }) }))
    expect((await change(oldTag)).status).toBe(204)
    expect(tables.shared_lists).toEqual([expect.objectContaining({ id: collabId, version: 1, word_count: 2 })])
    expect((await change(oldTag)).status).toBe(412)
    expect((await share.GET(new Request(`https://app.test/api/share?id=${collabId}`))).headers.get('etag')).toBe('"v1"')

    // Writes go to the tables; a removal reaches both, so a file not copied yet cannot come back.
    expect((await friendsPost(VELI_P, { action: 'friends-remove', code: me.code })).status).toBe(200)
    expect((await friendsView(VELI_P)).friends).toEqual([])
    expect((await share.DELETE(new Request(`https://app.test/api/share?id=${setId}`, { method: 'DELETE', headers: as(...ALI_P) }))).status).toBe(204)
    expect(blobs.has(`share/${setId}.json`)).toBe(false)
    await push.POST(new Request('https://app.test/api/push', { method: 'POST', body: JSON.stringify({ action: 'remove', endpoint }) }))
    expect([...blobs.keys()].some((k) => k.startsWith('push/'))).toBe(false)

    // The rest of the move: the removed things stay removed, the files are no longer read.
    await moveAll()
    expect(await adminState()).toBe('on')
    expect(tables.shared_lists!.map((r) => r.id)).toEqual([collabId])
    expect(tables.reminders).toEqual([])
    expect((await friendsView(VELI_P)).friends).toEqual([])
    for (const key of [...blobs.keys()]) if (/^(friends|share|push)\//.test(key)) blobs.delete(key)
    expect((await friendsView(ALI_P)).me.code).toBe(me.code)
  })

  it('a long list of files is copied a page at a time', async () => {
    for (let i = 0; i < 20; i++) setBlob(`push/${i.toString(16).padStart(40, '0')}.json`, { owner: ALI, tz: 0, hour: 9, studiedDay: null, streak: 0, plan: '', group: ALI, subscription: { endpoint: `https://fcm.googleapis.com/fcm/send/x${i}`, keys: { p256dh: 'p', auth: 'a' } } })
    const pushSteps: number[] = []
    let from: unknown
    const first = await moveStep()
    settle()
    from = first.next
    for (let i = 0; i < 20 && from; i++) {
      const step = await moveStep(from)
      if (step.at === 'push/') pushSteps.push(step.copied)
      from = step.next
    }
    expect(pushSteps).toEqual([15, 5])
    expect(tables.reminders).toHaveLength(20)
    expect(await adminState()).toBe('on')
  })

  it('without 0003 the move is refused and Blob stays in use', async () => {
    reset(false)
    expect(await adminState()).toBe('missing')
    expect((await adminPost({ action: 'move-tables' })).status).toBe(409)
    expect((await friendsPost(ALI_P, { action: 'friends-publish', ...card })).status).toBe(200)
    expect(blobs.has(`friends/card/${ALI}.json`)).toBe(true)
  })
})
