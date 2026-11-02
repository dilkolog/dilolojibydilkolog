import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// An in-memory Blob store behind the real /api/access handlers (as in apiFriends.test.ts).
const blobs = new Map<string, Uint8Array>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: string, opts: { allowOverwrite?: boolean }) => {
    if (opts.allowOverwrite === false && blobs.has(path)) throw new Error('exists')
    blobs.set(path, new TextEncoder().encode(body))
    return {}
  },
  get: async (path: string) => {
    const b = blobs.get(path)
    return b
      ? {
          statusCode: 200,
          stream: new Response(b.slice()).body,
          blob: { etag: '"v1"' },
        }
      : null
  },
  list: async ({ prefix }: { prefix: string }) => ({
    blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })),
  }),
  del: async (path: string) => void blobs.delete(path),
}))

const access = await import('../../api/access')
const { clearAccessCache } = await import('../../api/_account')
const { resetRate } = await import('../../api/_rate')
const { resetQuota } = await import('../../api/_quota')

const hex = async (t: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('')
const set = (path: string, value: unknown) => void blobs.set(path, new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)))

/** Four approved accounts: a, b, c, d. */
const PEOPLE = ['a', 'b', 'c', 'd'].map((c, i) => ({
  id: c.repeat(64),
  token: String(i + 1).repeat(64),
}))
const [ALI, VELI] = PEOPLE
const as = (p: { id: string; token: string }) => ({
  'sec-fetch-site': 'same-origin',
  'x-sync-id': p.id,
  'x-sync-auth': p.token,
})
const post = (p: { id: string; token: string }, body: unknown) =>
  access.POST(
    new Request('https://app.test/api/access', {
      method: 'POST',
      headers: as(p),
      body: JSON.stringify(body),
    }),
  )
const card = {
  avatar: 'fox',
  color: '#2f6de6',
  streak: 1,
  level: 1,
  days: {},
  today: '2026-10-28',
}
const publish = async (p: { id: string; token: string }, name: string) => ((await (await post(p, { action: 'friends-publish', ...card, name })).json()) as { me: { code: string } }).me.code

let mails: { to: string[]; subject: string; html: string; text: string }[]
beforeEach(async () => {
  blobs.clear()
  clearAccessCache()
  resetRate()
  resetQuota()
  mails = []
  vi.stubEnv('ADMIN_TOKEN', 'owner-secret')
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('OWNER_EMAIL', 'owner@example.com')
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    mails.push(...(JSON.parse(String(init.body)) as typeof mails))
    return Response.json({ data: [] })
  })
  for (const p of PEOPLE) {
    set(`sync/${p.id}/auth.txt`, await hex(p.token))
    set(`access/approved/${p.id}.json`, '{}')
  }
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const TOKEN = 'a-long-random-owner-token-1234567890'
const owner = (query: string, token = TOKEN) =>
  access.GET(new Request(`https://app.test/api/access?${query}`, { headers: { 'sec-fetch-site': 'same-origin', authorization: `Bearer ${token}` } }))
const day = () => new Date().toISOString().slice(0, 10)

describe('the owner\'s view (REPORTS_TOKEN)', () => {
  it('does not exist without the secret, and a wrong one looks the same', async () => {
    expect((await owner('owner=reports')).status).toBe(404)
    vi.stubEnv('REPORTS_TOKEN', TOKEN)
    expect((await owner('owner=reports', 'not-the-token-not-the-token-xx')).status).toBe(404)
    expect((await access.GET(new Request('https://app.test/api/access?owner=reports', { headers: { 'sec-fetch-site': 'same-origin' } }))).status).toBe(404)
    // A short secret is not a secret: it is not accepted even when it matches.
    vi.stubEnv('REPORTS_TOKEN', 'short')
    expect((await owner('owner=reports', 'short')).status).toBe(404)
  })

  it('lists the last days\' reports, newest first, with the social use counters', async () => {
    vi.stubEnv('REPORTS_TOKEN', TOKEN)
    set(`reports/${day()}/aaa.json`, { id: 'aaa', at: `${day()}T08:00:00.000Z`, kind: 'user', reason: 'spam', note: '', reporter: 'r', target: 'X', content: 'one' })
    set(`reports/${day()}/bbb.json`, { id: 'bbb', at: `${day()}T09:00:00.000Z`, kind: 'set', reason: 'other', note: 'n', reporter: 'r', target: 'y', content: 'two' })
    set(`reports/2020-01-01/old.json`, { id: 'old', at: '2020-01-01T09:00:00.000Z', kind: 'user', reason: 'spam', note: '', reporter: 'r', target: 'X', content: 'old' })
    set(`quota/use-friend-request/${day()}/all.json`, { used: 3 })
    const res = await owner('owner=reports&days=3')
    expect(res.status).toBe(200)
    const data = (await res.json()) as { reports: { id: string }[]; usage: Record<string, Record<string, number>> }
    expect(data.reports.map((r) => r.id)).toEqual(['bbb', 'aaa'])
    expect(data.usage['friend-request']).toEqual({ [day()]: 3 })
    expect(data.usage['friend-add']).toEqual({})
  })

  it('takes a library list off the library only for the owner, and only a real list id', async () => {
    expect((await access.POST(new Request('https://app.test/api/access', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ action: 'owner-unpublish', id: 'a'.repeat(32) }) }))).status).toBe(404)
    vi.stubEnv('REPORTS_TOKEN', TOKEN)
    const asOwner = (id: string) => access.POST(new Request('https://app.test/api/access', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin', authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ action: 'owner-unpublish', id }) }))
    expect((await asOwner('not-a-list')).status).toBe(400)
  })
})

describe('what is counted', () => {
  it('a friend request, an added friend, a cheer and a report are counted as a whole-site number, with no one in it', async () => {
    const aliCode = await publish(ALI, 'Ali')
    const veliCode = await publish(VELI, 'Veli')
    await post(VELI, { action: 'friends-add', code: aliCode })
    await post(ALI, { action: 'friends-send', code: veliCode, kind: 'cheer' })
    await post(ALI, { action: 'report', kind: 'user', target: veliCode, reason: 'spam' })
    await new Promise((r) => setTimeout(r, 20))
    const used = (name: string) => {
      const raw = blobs.get(`quota/use-${name}/${day()}/all.json`)
      return raw ? (JSON.parse(new TextDecoder().decode(raw)) as { used: number }).used : 0
    }
    expect(used('friend-add')).toBeGreaterThanOrEqual(1)
    expect(used('friend-cheer')).toBe(1)
    expect(used('report')).toBe(1)
    expect(used('friend-nudge')).toBe(0)
  })

  it('a text with links is not delivered; a title or gift with one neither; a link or two in a longer text is fine', async () => {
    const aliCode = await publish(ALI, 'Ali')
    const veliCode = await publish(VELI, 'Veli')
    await post(VELI, { action: 'friends-add', code: aliCode })
    const send = (payload: unknown, kind = 'text') => post(ALI, { action: 'friends-send', code: veliCode, kind, payload }).then((r) => r.status)
    const base = 'Un texte assez long pour être envoyé à un ami, vraiment.'
    expect(await send({ language: 'fr', title: 'Bonjour', body: `${base} Voir https://a.example/x` })).toBe(200)
    expect(await send({ language: 'fr', title: 'Bonjour', body: `${base} https://a.example/1 https://b.example/2 https://c.example/3` })).toBe(400)
    expect(await send({ language: 'fr', title: 'Gagne de l\'argent sur www.exemple.com', body: base })).toBe(400)
    expect(await send({ language: 'fr', lemma: 'chat', meaning: 'kedi www.spam.com', example: '' }, 'gift')).toBe(400)
  })
})
