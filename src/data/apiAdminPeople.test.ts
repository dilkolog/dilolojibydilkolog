import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@vercel/blob', () => ({ put: async () => ({}), get: async () => null, list: async () => ({ blobs: [] }), del: async () => undefined }))

const admin = await import('../../api/admin')
const { resetDocs } = await import('../../api/_docs')

const SB = 'https://proj.supabase.co'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
type Row = { user_id: string; email: string; username: string; approved: boolean; rejected: boolean; created_at: string; ai_level: string | null }
let profiles: Row[] = []
let levelsColumn = true
const patches: { id: string; body: Record<string, unknown> }[] = []
const deletedUsers: string[] = []

const USERS: Record<string, { id: string; email: string; email_confirmed_at: string | null }> = {
  'tok-owner': { id: '99999999-9999-4999-8999-999999999999', email: 'sahip@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
  'tok-other': { id: '88888888-8888-4888-8888-888888888888', email: 'biri@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
}

function fakeSupabase(input: string, init: RequestInit = {}): Response {
  const url = new URL(input)
  if (url.pathname === '/auth/v1/user') {
    const user = USERS[new Headers(init.headers).get('authorization')?.replace('Bearer ', '') ?? '']
    return user ? Response.json(user) : Response.json({}, { status: 401 })
  }
  const gone = /^\/auth\/v1\/admin\/users\/(.+)$/.exec(url.pathname)
  if (gone && init.method === 'DELETE') {
    deletedUsers.push(gone[1])
    profiles = profiles.filter((p) => p.user_id !== gone[1])
    return Response.json({})
  }
  if (url.pathname !== '/rest/v1/profiles') return Response.json([])
  const select = url.searchParams.get('select') ?? ''
  if (!levelsColumn && select.includes('ai_level')) return Response.json({ code: '42703', message: 'column profiles.ai_level does not exist' }, { status: 400 })
  if (init.method === 'PATCH') {
    const id = url.searchParams.get('user_id')!.replace('eq.', '')
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    if (!levelsColumn && 'ai_level' in body) return Response.json({ code: '42703', message: 'column "ai_level" does not exist' }, { status: 400 })
    patches.push({ id, body })
    profiles = profiles.map((p) => (p.user_id === id ? { ...p, ...body } : p))
    return Response.json(profiles.filter((p) => p.user_id === id))
  }
  let rows = profiles
  const only = url.searchParams.get('user_id')
  if (only) rows = rows.filter((p) => `eq.${p.user_id}` === only)
  if (url.searchParams.get('approved') === 'eq.false') rows = rows.filter((p) => !p.approved)
  if (url.searchParams.get('approved') === 'eq.true') rows = rows.filter((p) => p.approved)
  if (url.searchParams.get('rejected') === 'eq.false') rows = rows.filter((p) => !p.rejected)
  if (url.searchParams.get('rejected') === 'eq.true') rows = rows.filter((p) => p.rejected)
  const or = url.searchParams.get('or')
  if (or) {
    const term = /ilike\.\*(.+?)\*/.exec(or)?.[1] ?? ''
    rows = rows.filter((p) => p.email.includes(term) || p.username.includes(term))
  }
  if (new Headers(init.headers).get('prefer')?.includes('count=exact')) {
    return new Response('[]', { headers: { 'content-range': `0-0/${rows.length}` } })
  }
  return Response.json(rows.map((r) => (select.includes('ai_level') ? r : { ...r, ai_level: undefined })))
}

const get = (query: string, token = 'tok-owner') => admin.GET(new Request(`https://app.test/api/admin${query}`, { headers: { authorization: `Bearer ${token}` } }))
const post = (body: unknown, token = 'tok-owner') => admin.POST(new Request('https://app.test/api/admin', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) }))

beforeEach(() => {
  profiles = [
    { user_id: A, email: 'ayse@example.com', username: 'ayse', approved: false, rejected: false, created_at: '2026-11-04T10:00:00Z', ai_level: null },
    { user_id: B, email: 'veli@example.com', username: 'veli', approved: true, rejected: false, created_at: '2026-11-01T10:00:00Z', ai_level: 'tam' },
  ]
  levelsColumn = true
  patches.length = 0
  deletedUsers.length = 0
  resetDocs()
  vi.stubEnv('SUPABASE_URL', SB)
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
  vi.stubEnv('OWNER_EMAIL', 'sahip@example.com')
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => fakeSupabase(String(input), init))
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("the owner's admin screen: people", () => {
  it('says who the owner is, and to nobody else', async () => {
    expect(await (await get('?view=me')).json()).toEqual({ owner: true })
    expect((await get('?view=me', 'tok-other')).status).toBe(403)
  })

  it('lists who waits, who is approved, and finds by e-mail', async () => {
    const pending = (await (await get('?view=people&filter=pending')).json()) as { people: { email: string }[]; pending: number; levels: boolean }
    expect(pending.people.map((p) => p.email)).toEqual(['ayse@example.com'])
    expect(pending.pending).toBe(1)
    expect(pending.levels).toBe(true)
    const approved = (await (await get('?view=people&filter=approved')).json()) as { people: { email: string; aiLevel: string }[] }
    expect(approved.people).toMatchObject([{ email: 'veli@example.com', aiLevel: 'tam' }])
    const found = (await (await get('?view=people&filter=all&q=VELI')).json()) as { people: { email: string }[] }
    expect(found.people.map((p) => p.email)).toEqual(['veli@example.com'])
  })

  it('approves, turns down, puts back to waiting and sets the AI level', async () => {
    expect((await post({ action: 'person', user: A, change: 'approve' })).status).toBe(200)
    expect(patches.at(-1)).toEqual({ id: A, body: { approved: true, rejected: false } })
    expect((await post({ action: 'person', user: A, change: 'reject' })).status).toBe(200)
    expect(patches.at(-1)!.body).toEqual({ approved: false, rejected: true })
    expect((await post({ action: 'person', user: A, change: 'wait' })).status).toBe(200)
    expect(patches.at(-1)!.body).toEqual({ approved: false, rejected: false })
    expect((await post({ action: 'person', user: B, level: 'kelime' })).status).toBe(200)
    expect(patches.at(-1)!.body).toEqual({ ai_level: 'kelime' })
    expect((await post({ action: 'person', user: B, level: null })).status).toBe(200)
    expect(patches.at(-1)!.body).toEqual({ ai_level: null })
  })

  it('refuses a made-up level, a bad id and another person', async () => {
    expect((await post({ action: 'person', user: B, level: 'super' })).status).toBe(400)
    expect((await post({ action: 'person', user: 'not-a-uuid', change: 'approve' })).status).toBe(400)
    expect((await post({ action: 'person', user: A, change: 'approve' }, 'tok-other')).status).toBe(403)
    expect(patches).toHaveLength(0)
  })

  it('without migration 0007 the list still works, without levels, and setting one says so', async () => {
    levelsColumn = false
    const list = (await (await get('?view=people&filter=approved')).json()) as { people: { aiLevel: unknown }[]; levels: boolean }
    expect(list.levels).toBe(false)
    expect(list.people[0].aiLevel).toBeNull()
    expect((await post({ action: 'person', user: B, level: 'tam' })).status).toBe(409)
  })

  it("deletes someone's account only with their e-mail typed, and never an owner's", async () => {
    expect((await post({ action: 'person-delete', user: A })).status).toBe(400)
    expect((await post({ action: 'person-delete', user: A, confirm: 'veli@example.com' })).status).toBe(400)
    expect((await post({ action: 'person-delete', user: A, confirm: 'ayse@example.com' }, 'tok-other')).status).toBe(403)
    expect(deletedUsers).toEqual([])
    expect((await post({ action: 'person-delete', user: A, confirm: ' AYSE@example.com ' })).status).toBe(200)
    expect(deletedUsers).toEqual([A])
    expect((await post({ action: 'person-delete', user: A, confirm: 'ayse@example.com' })).status).toBe(404)
    profiles.push({ user_id: B.replace('2222', '9999'), email: 'sahip@example.com', username: 'sahip', approved: true, rejected: false, created_at: '2026-01-01T00:00:00Z', ai_level: 'tam' })
    expect((await post({ action: 'person-delete', user: B.replace('2222', '9999'), confirm: 'sahip@example.com' })).status).toBe(403)
    expect(deletedUsers).toEqual([A])
  })
})

describe("the owner's second secret (OWNER_STEP_SECRET)", () => {
  const SECRET = 'a-long-second-secret-1234'
  const postWith = (body: unknown, secret?: string) =>
    admin.POST(new Request('https://app.test/api/admin', { method: 'POST', headers: { authorization: 'Bearer tok-owner', ...(secret ? { 'x-owner-secret': secret } : {}) }, body: JSON.stringify(body) }))

  it('is asked for deleting someone once it is set: the owner\'s sign-in alone is not enough', async () => {
    vi.stubEnv('OWNER_STEP_SECRET', SECRET)
    const del = { action: 'person-delete', user: A, confirm: 'ayse@example.com' }
    expect(await (await postWith(del)).json()).toEqual({ error: 'owner_secret' })
    expect(await (await postWith(del, 'wrong-wrong-wrong-wrong')).json()).toEqual({ error: 'owner_secret_wrong' })
    expect(deletedUsers).toEqual([])
    expect((await postWith(del, SECRET)).status).toBe(200)
    expect(deletedUsers).toEqual([A])
  })

  it('guards approving everyone and the limits too, not the everyday steps', async () => {
    vi.stubEnv('OWNER_STEP_SECRET', SECRET)
    expect((await postWith({ action: 'approve-all' })).status).toBe(403)
    expect((await postWith({ action: 'settings', settings: { aiDailyCalls: 10 } })).status).toBe(403)
    // Approving one person or changing their AI level stays a single step.
    expect((await postWith({ action: 'person', user: A, change: 'approve' })).status).toBe(200)
  })

  it('changes nothing while it is not set', async () => {
    expect((await postWith({ action: 'person-delete', user: A, confirm: 'ayse@example.com' })).status).toBe(200)
  })
})
