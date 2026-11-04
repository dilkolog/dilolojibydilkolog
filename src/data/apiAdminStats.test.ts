import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@vercel/blob', () => ({ put: async () => ({}), get: async () => null, list: async () => ({ blobs: [] }), del: async () => undefined }))

const admin = await import('../../api/admin')
const access = await import('../../api/access')
const { resetDocs } = await import('../../api/_docs')
const { forgetSettings, limitOf, cleanSettings, currentAnnouncement } = await import('../../api/_settings')
const { blockOf } = await import('../../api/_adminStats')
const { resetRate } = await import('../../api/_rate')

// A small in-memory PostgREST: a few tables, the filters the server uses (eq, gte, in), count=exact, upsert and delete.
const SB = 'https://proj.supabase.co'
const NOW = Date.parse('2026-11-04T12:00:00Z')
const DAY = 86_400_000
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const SYNC_A = 'a'.repeat(64)
const SYNC_B = 'b'.repeat(64)
type Row = Record<string, unknown>
let tables: Record<string, Row[]> = {}
const missing = new Set<string>()
const authUsers: Record<string, Row> = {}

const USERS: Record<string, { id: string; email: string; email_confirmed_at: string }> = {
  'tok-owner': { id: '99999999-9999-4999-8999-999999999999', email: 'sahip@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
  'tok-other': { id: '88888888-8888-4888-8888-888888888888', email: 'biri@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
}

function matches(row: Row, params: URLSearchParams): boolean {
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'on_conflict', 'or'].includes(key)) continue
    const [op, ...rest] = raw.split('.')
    const value = decodeURIComponent(rest.join('.'))
    const have = String(row[key] ?? '')
    if (op === 'eq' && have !== value) return false
    if (op === 'gte' && !(have >= value)) return false
    if (op === 'in' && !value.replace(/^\(|\)$/g, '').split(',').includes(have)) return false
  }
  return true
}

function fake(input: string, init: RequestInit = {}): Response {
  const url = new URL(input)
  const headers = new Headers(init.headers)
  if (url.pathname === '/auth/v1/user') {
    const user = USERS[headers.get('authorization')?.replace('Bearer ', '') ?? '']
    return user ? Response.json(user) : Response.json({}, { status: 401 })
  }
  if (url.pathname === '/storage/v1/object/list/media') return Response.json([])
  const auth = /^\/auth\/v1\/admin\/users\/(.+)$/.exec(url.pathname)
  if (auth && init.method === 'DELETE') {
    tables.profiles = tables.profiles.filter((p) => p.user_id !== auth[1])
    return Response.json({})
  }
  if (auth) return authUsers[auth[1]] ? Response.json(authUsers[auth[1]]) : Response.json({}, { status: 404 })
  const name = url.pathname.replace('/rest/v1/', '')
  if (missing.has(name)) return Response.json({ code: 'PGRST205', message: `Could not find the table 'public.${name}'` }, { status: 404 })
  const table = (tables[name] ??= [])
  const method = init.method ?? 'GET'
  if (method === 'POST') {
    const body = JSON.parse(String(init.body)) as Row
    const keys = (url.searchParams.get('on_conflict') ?? '').split(',').filter(Boolean)
    const at = table.findIndex((r) => keys.length && keys.every((k) => r[k] === body[k]))
    if (at >= 0) table[at] = { ...table[at], ...body }
    else table.push({ created_at: new Date(NOW).toISOString(), ...body })
    return new Response(null, { status: 201 })
  }
  const hits = table.filter((r) => matches(r, url.searchParams))
  if (method === 'PATCH') {
    const patch = JSON.parse(String(init.body)) as Row
    hits.forEach((r) => Object.assign(r, patch))
    return Response.json(hits)
  }
  if (method === 'DELETE') {
    tables[name] = table.filter((r) => !hits.includes(r))
    return new Response(null, { status: 204 })
  }
  if (headers.get('prefer')?.includes('count=exact')) return new Response('[]', { headers: { 'content-range': `0-0/${hits.length}` } })
  return Response.json(hits)
}

const get = (query: string, token = 'tok-owner') => admin.GET(new Request(`https://app.test/api/admin${query}`, { headers: { authorization: `Bearer ${token}` } }))
const post = (body: unknown, token = 'tok-owner') => admin.POST(new Request('https://app.test/api/admin', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) }))
const iso = (t: number) => new Date(t).toISOString()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  tables = {
    profiles: [
      { user_id: A, email: 'ayse@example.com', approved: false, rejected: false, created_at: iso(NOW - DAY) },
      { user_id: B, email: 'veli@example.com', approved: true, rejected: false, created_at: iso(NOW - 20 * DAY) },
      { user_id: 'c', email: 'can@example.com', approved: false, rejected: false, created_at: iso(NOW) },
    ],
    sync_parts: [
      { user_id: A, name: 'core', bytes: 1_000_000, updated_at: iso(NOW - 2 * DAY) },
      { user_id: A, name: 'ev-2026-11', bytes: 500_000, updated_at: iso(NOW - 2 * DAY) },
      { user_id: B, name: 'core', bytes: 2000, updated_at: iso(NOW - 15 * DAY) },
    ],
    sync_keys: [
      { user_id: A, sync_id: SYNC_A },
      { user_id: B, sync_id: SYNC_B },
    ],
    people: [{ user_id: A, words: 320, answers: 1500, texts: 4, last_sync: iso(NOW - 2 * DAY) }],
    usage_counters: [
      { name: 'ai', day: '2026-11-04', subject: SYNC_A, used: 12 },
      { name: 'ai-cost', day: '2026-11-04', subject: SYNC_A, used: 4000 },
      { name: 'translate', day: '2026-11-04', subject: SYNC_B, used: 900 },
      { name: 'ai', day: '2026-11-02', subject: SYNC_B, used: 30 },
      { name: 'ai-cost', day: '2026-11-02', subject: SYNC_B, used: 25000 },
    ],
    owner_blocks: [],
    server_flags: [],
  }
  missing.clear()
  for (const k of Object.keys(authUsers)) delete authUsers[k]
  authUsers[A] = { id: A, last_sign_in_at: iso(NOW - DAY), app_metadata: { provider: 'google' } }
  resetDocs()
  resetRate()
  forgetSettings()
  vi.stubEnv('SUPABASE_URL', SB)
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
  vi.stubEnv('OWNER_EMAIL', 'sahip@example.com')
  vi.stubEnv('ADMIN_TOKEN', '')
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => fake(String(input), init))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("the owner's admin screen: numbers and usage", () => {
  it('counts people, who waits, who came back, and new sign-ups by day', async () => {
    const s = (await (await get('?view=stats')).json()) as { total: number; pending: number; active7: number; active30: number; newByDay: { day: string; count: number }[] }
    expect(s).toMatchObject({ total: 3, pending: 2, active7: 1, active30: 2 })
    expect(s.newByDay).toHaveLength(7)
    expect(s.newByDay.at(-1)).toEqual({ day: '2026-11-04', count: 1 })
    expect(s.newByDay.at(-2)).toEqual({ day: '2026-11-03', count: 1 })
  })

  it("adds up today's and the month's use of the paid services, and names today's heaviest user", async () => {
    const u = (await (await get('?view=usage')).json()) as { available: boolean; today: Record<string, number>; month: Record<string, number>; top: { email: string; aiUsd: number }[] }
    expect(u.available).toBe(true)
    expect(u.today).toMatchObject({ aiCalls: 12, aiUsd: 0.4, translateChars: 900, people: 2 })
    expect(u.month).toMatchObject({ aiCalls: 42, aiUsd: 2.9 })
    expect(u.top[0]).toMatchObject({ email: 'ayse@example.com', aiUsd: 0.4 })
  })

  it('says the counters are not there yet without migration 0009', async () => {
    missing.add('usage_counters')
    expect(await (await get('?view=usage')).json()).toMatchObject({ available: false })
  })

  it('without the synced data tables (sync kept in R2) the numbers still load, the unknown ones null', async () => {
    missing.add('sync_parts')
    missing.add('people')
    const res = await get('?view=stats')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ total: 3, pending: 2, active7: null, active30: null })
    const d = await (await get(`?view=person&user=${A}`)).json()
    expect(d).toMatchObject({ words: null, answers: null, texts: null, bytes: null, lastSync: null, provider: 'google' })
  })

  it("shows one person's figures, sign-in and today's use", async () => {
    const d = (await (await get(`?view=person&user=${A}`)).json()) as Record<string, unknown>
    expect(d).toMatchObject({ words: 320, answers: 1500, texts: 4, bytes: 1_500_000, provider: 'google', today: { aiCalls: 12, aiUsd: 0.4 } })
    expect((await get('?view=person&user=nope')).status).toBe(400)
    expect((await get(`?view=person&user=${'33333333-3333-4333-8333-333333333333'}`)).status).toBe(404)
  })

  it('approves everyone waiting at once, and only for the owner', async () => {
    expect((await post({ action: 'approve-all' }, 'tok-other')).status).toBe(503)
    expect(await (await post({ action: 'approve-all' })).json()).toEqual({ ok: true, approved: 2 })
    expect(tables.profiles.every((p) => p.approved)).toBe(true)
  })
})

describe("the owner's switches: limits, auto-approval, announcement", () => {
  it('keeps a limit in range and the setting wins over the variable and the default', async () => {
    expect(await limitOf('translateChars', 20000)).toBe(20000)
    vi.stubEnv('AI_DAILY_CALLS', '90')
    expect(await limitOf('aiDailyCalls', 150, 'AI_DAILY_CALLS')).toBe(90)
    const saved = (await (await post({ action: 'settings', settings: { aiDailyCalls: 40, translateChars: 99, sneaky: 1 } })).json()) as { settings: Record<string, unknown>; effective: Record<string, number> }
    expect(saved.settings).toEqual({ aiDailyCalls: 40 })
    expect(saved.effective.aiDailyCalls).toBe(40)
    forgetSettings()
    expect(await limitOf('aiDailyCalls', 150, 'AI_DAILY_CALLS')).toBe(40)
    await post({ action: 'settings', settings: { aiDailyCalls: null, autoApprove: true } })
    forgetSettings()
    expect(await limitOf('aiDailyCalls', 150, 'AI_DAILY_CALLS')).toBe(90)
    expect((await (await get('?view=settings')).json()).settings).toEqual({ autoApprove: true })
    expect((await post({ action: 'settings', settings: { nothing: 1 } })).status).toBe(400)
  })

  it('Facebook sign-in shows on the sign-in page only once the owner turns it on', async () => {
    const ask = async () => (await (await access.GET(new Request('https://app.test/api/access?signin=1', { headers: { 'sec-fetch-site': 'same-origin' } }))).json()) as { facebook: boolean }
    expect(await ask()).toEqual({ facebook: false })
    expect((await post({ action: 'settings', settings: { facebookLogin: true } })).status).toBe(200)
    forgetSettings()
    expect(await ask()).toEqual({ facebook: true })
    expect((await post({ action: 'settings', settings: { facebookLogin: 'yes' } }, 'tok-other')).status).toBe(503)
  })

  it('a stored value out of range or of the wrong kind is dropped', () => {
    expect(cleanSettings({ aiDailyBudgetUsd: 0.123, ttsChars: 10, autoApprove: 'yes', announcement: { id: 'x', text: 'hi', at: 'never' } })).toEqual({ aiDailyBudgetUsd: 0.12 })
  })

  it('an announcement reaches everyone through /api/access?news, is cleaned, and can be taken back', async () => {
    expect((await post({ action: 'announce', text: 'x'.repeat(221) })).status).toBe(400)
    const sent = (await (await post({ action: 'announce', text: '  Bu gece bakım var.‮ ' })).json()) as { announcement: { id: string; text: string } }
    expect(sent.announcement.text).toBe('Bu gece bakım var.')
    forgetSettings()
    const news = await access.GET(new Request('https://app.test/api/access?news=1', { headers: { 'sec-fetch-site': 'same-origin' } }))
    expect(await news.json()).toMatchObject({ announcement: { id: sent.announcement.id, text: 'Bu gece bakım var.' } })
    vi.setSystemTime(NOW + 31 * DAY)
    forgetSettings()
    expect(await currentAnnouncement()).toBeNull()
    vi.setSystemTime(NOW)
    await post({ action: 'announce', text: '' })
    forgetSettings()
    expect(await currentAnnouncement()).toBeNull()
  })
})

describe("the owner's block list", () => {
  it('reads an address or a domain, nothing else', () => {
    expect(blockOf(' Kotu@Example.com ')).toEqual({ kind: 'email', value: 'kotu@example.com' })
    expect(blockOf('@spam.example')).toEqual({ kind: 'domain', value: 'spam.example' })
    expect(blockOf('not a thing')).toBeNull()
    expect(blockOf('x')).toBeNull()
  })

  it('adds, lists and removes; says so when migration 0011 is missing', async () => {
    expect((await post({ action: 'block', value: 'nonsense' })).status).toBe(400)
    expect((await post({ action: 'block', value: 'kotu@example.com', note: 'spam' })).status).toBe(200)
    expect((await post({ action: 'block', value: 'spam.example' })).status).toBe(200)
    const list = (await (await get('?view=blocks')).json()) as { available: boolean; blocks: { kind: string; value: string }[] }
    expect(list.blocks.map((b) => `${b.kind}:${b.value}`).sort()).toEqual(['domain:spam.example', 'email:kotu@example.com'])
    expect((await post({ action: 'unblock', kind: 'domain', value: 'spam.example' })).status).toBe(200)
    expect(tables.owner_blocks).toHaveLength(1)
    missing.add('owner_blocks')
    expect(await (await get('?view=blocks')).json()).toEqual({ available: false, blocks: [] })
    expect((await post({ action: 'block', value: 'a@b.com' })).status).toBe(409)
  })

  it('deleting a person can block their address too', async () => {
    const res = await post({ action: 'person-delete', user: A, confirm: 'ayse@example.com', block: true })
    expect(await res.json()).toEqual({ ok: true, blocked: 'ok' })
    expect(tables.owner_blocks).toMatchObject([{ kind: 'email', value: 'ayse@example.com' }])
    expect(tables.profiles.some((p) => p.user_id === A)).toBe(false)
  })
})
