import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

// An in-memory Blob store behind the real /api/access handlers.
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
  del: async (path: string) => void blobs.delete(path),
}))

const access = await import('../../api/access')
const { clearAccessCache } = await import('../../api/_account')
const { resetRate } = await import('../../api/_rate')

const ALI = 'a'.repeat(64)
const ALI_TOKEN = '1'.repeat(64)
const VELI = 'b'.repeat(64)
const VELI_TOKEN = '2'.repeat(64)
const APP = { 'sec-fetch-site': 'same-origin' }
const as = (id: string, token: string) => ({ ...APP, 'x-sync-id': id, 'x-sync-auth': token })
const hex = async (t: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('')
const set = (path: string, value: string) => void blobs.set(path, new TextEncoder().encode(value))

const post = (headers: Record<string, string>, body: unknown) => access.POST(new Request('https://app.test/api/access', { method: 'POST', headers, body: JSON.stringify(body) }))
const view = (headers: Record<string, string>, today = '2026-10-15') => access.GET(new Request(`https://app.test/api/access?friends=1&today=${today}`, { headers }))
const card = { name: 'Ali', avatar: 'fox', color: '#2f6de6', streak: 5, level: 6, days: { '2026-10-15': 40, '2026-10-12': 60, '2026-10-01': 500 }, today: '2026-10-15' }

beforeEach(async () => {
  blobs.clear()
  clearAccessCache()
  resetRate()
  vi.stubEnv('ADMIN_TOKEN', 'owner-secret')
  set(`sync/${ALI}/auth.txt`, await hex(ALI_TOKEN))
  set(`sync/${VELI}/auth.txt`, await hex(VELI_TOKEN))
  set(`access/approved/${ALI}.json`, '{}')
  set(`access/approved/${VELI}.json`, '{}')
})
afterEach(() => vi.unstubAllEnvs())

describe('/api/access: friends', () => {
  it('a card is published under a code; a friend who adds the code sees today and this week, never the id', async () => {
    const pub = await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card })
    expect(pub.status).toBe(200)
    const { me } = (await pub.json()) as { me: { code: string } }
    expect(me.code).toMatch(/^[2-9A-HJKMNP-Z]{8}$/)

    // Typed by hand: lower case, a dash.
    const typed = `${me.code.slice(0, 4)}-${me.code.slice(4)}`.toLowerCase()
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: typed })).status).toBe(200)
    const res = await view(as(VELI, VELI_TOKEN))
    const body = (await res.json()) as { friends: { name: string; today: number; week: number; streak: number }[] }
    expect(body.friends).toEqual([expect.objectContaining({ name: 'Ali', today: 40, week: 100, streak: 5, code: me.code })])
    expect(JSON.stringify(body)).not.toContain(ALI)
    // A day older than two weeks is not kept.
    expect(JSON.stringify(body)).not.toContain('500')
  })

  it('refuses an unknown code, one\'s own code, and an account not approved', async () => {
    const { me } = (await (await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card })).json()) as { me: { code: string } }
    expect(await (await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: 'ZZZZZZZZ' })).json()).toEqual({ error: 'unknown' })
    expect(await (await post(as(ALI, ALI_TOKEN), { action: 'friends-add', code: me.code })).json()).toEqual({ error: 'self' })
    blobs.delete(`access/approved/${VELI}.json`)
    clearAccessCache()
    expect((await view(as(VELI, VELI_TOKEN))).status).toBe(403)
    expect((await view(APP)).status).toBe(403)
  })

  it('removes a friend, and keeps a name and avatar plain', async () => {
    const { me } = (await (await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card, name: '<b>Ali</b>\u0007' })).json()) as { me: { code: string; name: string } }
    expect(me.name).toBe('bAli/b')
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: me.code })
    await post(as(VELI, VELI_TOKEN), { action: 'friends-remove', code: me.code })
    expect(((await (await view(as(VELI, VELI_TOKEN))).json()) as { friends: unknown[] }).friends).toEqual([])
  })
})
