import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// An in-memory Blob store and a fake Supabase (auth + the two tables) behind the real /api/access handlers.
const blobs = new Map<string, Uint8Array>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: string, opts: { allowOverwrite?: boolean }) => {
    if (opts.allowOverwrite === false && blobs.has(path)) throw new Error('exists')
    blobs.set(path, new TextEncoder().encode(body))
    return {}
  },
  get: async (path: string) => {
    const b = blobs.get(path)
    return b ? { statusCode: 200, stream: new Response(b.slice()).body, blob: { etag: 'e' } } : null
  },
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })) }),
  del: async (path: string | string[]) => void (Array.isArray(path) ? path : [path]).forEach((p) => blobs.delete(p)),
}))

const access = await import('../../api/access')
const admin = await import('../../api/admin')
const { clearAccessCache, accessStatus } = await import('../../api/_account')
const { resetRate } = await import('../../api/_rate')

const SB = 'https://proj.supabase.co'
const USERS: Record<string, { id: string; email: string; user_metadata: Record<string, unknown> }> = {
  'tok-ali': { id: '11111111-1111-1111-1111-111111111111', email: 'ali@example.com', user_metadata: { username: 'ali' } },
  'tok-veli': { id: '22222222-2222-2222-2222-222222222222', email: 'veli@example.com', user_metadata: {} },
}
let profiles: { user_id: string; approved: boolean; rejected: boolean }[] = []
let keys: { user_id: string; sync_id: string; enc: string; auth: string; username: string | null }[] = []
const seen: { url: string; headers: Record<string, string> }[] = []
const deletedUsers: string[] = []

function fakeSupabase(input: string, init: RequestInit = {}): Response {
  const url = new URL(input)
  const headers = Object.fromEntries(new Headers(init.headers).entries())
  seen.push({ url: input, headers })
  if (url.pathname.startsWith('/auth/v1/admin/users/') && init.method === 'DELETE') {
    const id = url.pathname.split('/').pop()
    deletedUsers.push(id!)
    profiles = profiles.filter((p) => p.user_id !== id)
    keys = keys.filter((k) => k.user_id !== id)
    return new Response(null, { status: 200 })
  }
  if (url.pathname === '/auth/v1/user') {
    const user = USERS[(headers.authorization ?? '').replace('Bearer ', '')]
    return user ? Response.json(user) : Response.json({ msg: 'bad jwt' }, { status: 401 })
  }
  const table = url.pathname.replace('/rest/v1/', '')
  if (table === 'profiles' && init.method === 'PATCH') {
    const id = url.searchParams.get('user_id')?.replace('eq.', '')
    const patch = JSON.parse(String(init.body)) as { approved: boolean; rejected: boolean }
    profiles = profiles.map((p) => (p.user_id === id ? { ...p, ...patch } : p))
    return new Response(null, { status: 204 })
  }
  if (table === 'profiles' && init.method === 'POST') {
    const row = JSON.parse(String(init.body)) as { user_id: string }
    if (!profiles.some((p) => p.user_id === row.user_id)) profiles.push({ user_id: row.user_id, approved: false, rejected: false })
    return new Response(null, { status: 201 })
  }
  if (table === 'sync_keys' && init.method === 'POST') {
    const row = JSON.parse(String(init.body)) as (typeof keys)[number]
    if (keys.some((k) => k.sync_id === row.sync_id && k.user_id !== row.user_id)) return Response.json({ code: '23505' }, { status: 409 })
    keys = [...keys.filter((k) => k.user_id !== row.user_id), row]
    return new Response(null, { status: 201 })
  }
  if (table === 'sync_keys') {
    const byUser = url.searchParams.get('user_id')?.replace('eq.', '')
    const bySync = url.searchParams.get('sync_id')?.replace('eq.', '')
    const rows = keys.filter((k) => (byUser ? k.user_id === byUser : k.sync_id === bySync))
    if (bySync && url.searchParams.get('select') === 'user_id') return Response.json(rows.map((k) => ({ user_id: k.user_id })))
    if (bySync) return Response.json(rows.map((k) => ({ profiles: profiles.find((p) => p.user_id === k.user_id) ?? null })))
    return Response.json(rows)
  }
  return new Response('not found', { status: 404 })
}

const hex = async (t: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('')
const APP = { 'sec-fetch-site': 'same-origin' }
const bearer = (t: string) => ({ ...APP, authorization: `Bearer ${t}` })
const link = (token: string, body: Record<string, unknown>) => access.POST(new Request('https://app.test/api/access', { method: 'POST', headers: bearer(token), body: JSON.stringify({ action: 'vault-link', ...body }) }))
const vault = (token: string) => access.GET(new Request('https://app.test/api/access?vault=1', { headers: bearer(token) }))

const OLD = { id: 'a'.repeat(64), enc: 'c'.repeat(64), auth: '1'.repeat(64) }
const NEW = { id: 'd'.repeat(64), enc: 'e'.repeat(64), auth: 'f'.repeat(64) }

beforeEach(async () => {
  blobs.clear()
  clearAccessCache()
  resetRate()
  profiles = []
  keys = []
  seen.length = 0
  deletedUsers.length = 0
  vi.stubEnv('ADMIN_TOKEN', 'owner-secret')
  vi.stubEnv('SUPABASE_URL', SB)
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => fakeSupabase(String(input), init))
  blobs.set(`sync/${OLD.id}/auth.txt`, new TextEncoder().encode(await hex(OLD.auth)))
  blobs.set(`access/approved/${OLD.id}.json`, new TextEncoder().encode('{}'))
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('/api/access: the Supabase vault', () => {
  it('ties the old account to the person after checking its token; any device then gets it back', async () => {
    expect(await (await vault('tok-ali')).json()).toEqual({ account: null })
    const res = await link('tok-ali', { ...OLD, username: 'ali' })
    expect(res.status).toBe(200)
    // Approved before: stays approved, no new request filed.
    expect(await res.json()).toEqual({ status: 'approved' })
    expect(blobs.has(`access/requests/${OLD.id}.json`)).toBe(false)
    expect(await (await vault('tok-ali')).json()).toEqual({ account: { id: OLD.id, enc: OLD.enc, auth: OLD.auth, username: 'ali' } })
    // A new sb_ secret key goes only as `apikey`, never as the bearer.
    const rest = seen.filter((s) => s.url.includes('/rest/v1/'))
    expect(rest.every((s) => s.headers.apikey === 'sb_secret_test' && !s.headers.authorization)).toBe(true)
  })

  it('refuses a wrong token, another person\'s account, and a second account for the same person', async () => {
    expect((await link('tok-veli', { ...OLD, auth: '9'.repeat(64) })).status).toBe(403)
    expect((await link('tok-ali', OLD)).status).toBe(200)
    // Veli has the token too (shared password): the account still belongs to Ali.
    expect(await (await link('tok-veli', OLD)).json()).toEqual({ error: 'taken' })
    expect(await (await link('tok-ali', NEW)).json()).toEqual({ error: 'linked' })
  })

  it('a new account is claimed, waits for approval on the Yönetici card, and the profile switch approves it', async () => {
    const res = await link('tok-veli', NEW)
    expect(await res.json()).toEqual({ status: 'pending' })
    expect(blobs.has(`sync/${NEW.id}/auth.txt`)).toBe(true)
    const request = JSON.parse(new TextDecoder().decode(blobs.get(`access/requests/${NEW.id}.json`))) as { username: string; note: string }
    expect(request).toMatchObject({ username: 'veli', note: 'veli@example.com' })
    expect(profiles).toHaveLength(1)

    profiles[0]!.approved = true
    clearAccessCache()
    expect(await accessStatus(NEW.id)).toBe('approved')
    profiles[0]!.approved = false
    profiles[0]!.rejected = true
    clearAccessCache()
    expect(await accessStatus(NEW.id)).toBe('rejected')
  })

  it('needs a signed-in person, and is off without the Supabase settings', async () => {
    expect((await vault('nobody')).status).toBe(401)
    expect((await link('nobody', NEW)).status).toBe(401)
    vi.stubEnv('SUPABASE_SECRET_KEY', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    expect((await vault('tok-ali')).status).toBe(503)
    // The old approval keeps working without Supabase.
    clearAccessCache()
    expect(await accessStatus(OLD.id)).toBe('approved')
  })

  it('deletes the account: the person in Supabase and what the server keeps, not someone else\'s', async () => {
    await link('tok-ali', OLD)
    const put = (path: string, v: unknown) => void blobs.set(path, new TextEncoder().encode(JSON.stringify(v)))
    put(`sync/${OLD.id}/core`, {})
    put(`sync/${OLD.id}/ev-2026-10`, {})
    put(`push/mail-${'a'.repeat(40)}.json`, { owner: OLD.id, email: 'ali@example.com' })
    put(`push/mail-${'b'.repeat(40)}.json`, { owner: NEW.id, email: 'veli@example.com' })
    put(`sync/${NEW.id}/core`, {})
    // The devices that registered for push reminders: the leaving account's go, someone else's stay.
    put(`push/${'c'.repeat(40)}.json`, { owner: OLD.id, endpoint: 'https://fcm.googleapis.com/a' })
    put(`push/${'d'.repeat(40)}.json`, { owner: NEW.id, endpoint: 'https://fcm.googleapis.com/b' })
    const res = await access.POST(new Request('https://app.test/api/access', { method: 'POST', headers: bearer('tok-ali'), body: JSON.stringify({ action: 'account-delete' }) }))
    expect(res.status).toBe(200)
    expect(blobs.has(`push/${'c'.repeat(40)}.json`)).toBe(false)
    expect(blobs.has(`push/${'d'.repeat(40)}.json`)).toBe(true)
    expect([...blobs.keys()].filter((k) => k.includes(OLD.id) || k === `push/mail-${'a'.repeat(40)}.json`)).toEqual([])
    expect(blobs.has(`push/mail-${'b'.repeat(40)}.json`) && blobs.has(`sync/${NEW.id}/core`)).toBe(true)
    expect(deletedUsers).toEqual([USERS['tok-ali']!.id])
    expect(keys).toEqual([])
  })

  it('an account from before deletes itself with its own token only', async () => {
    const del = (headers: Record<string, string>) => access.POST(new Request('https://app.test/api/access', { method: 'POST', headers: { ...APP, ...headers }, body: JSON.stringify({ action: 'account-delete' }) }))
    // With Supabase the person's own sign-in deletes them; the old token alone would leave their Supabase data behind.
    expect((await del({ 'x-sync-id': OLD.id, 'x-sync-auth': OLD.auth })).status).toBe(401)
    expect(blobs.has(`sync/${OLD.id}/auth.txt`)).toBe(true)
    expect(deletedUsers).toEqual([])
  })

  it('carries the old approval to the profile, so the database lets the person write', async () => {
    await link('tok-ali', OLD)
    expect(profiles[0]).toMatchObject({ approved: true, rejected: false })
    // Approved later on the Yönetici card: the profile follows.
    await link('tok-veli', NEW)
    expect(profiles.find((p) => p.user_id === USERS['tok-veli']!.id)).toMatchObject({ approved: false })
    const res = await admin.POST(new Request('https://app.test/api/admin', { method: 'POST', headers: { authorization: 'Bearer owner-secret', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'approve', id: NEW.id }) }))
    expect(res.status).toBe(200)
    expect(profiles.find((p) => p.user_id === USERS['tok-veli']!.id)).toMatchObject({ approved: true })
  })
})
