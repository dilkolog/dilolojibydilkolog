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
const { HIDE_AFTER, REPORTS_A_DAY } = await import('../../api/_reports')

const hex = async (t: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('')
const set = (path: string, value: unknown) => void blobs.set(path, new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)))
const read = (path: string) => JSON.parse(new TextDecoder().decode(blobs.get(path)!)) as Record<string, unknown>
const reports = () => [...blobs.keys()].filter((k) => /^reports\/\d{4}-\d{2}-\d{2}\//.test(k)).map(read)

/** Four approved accounts: a, b, c, d. */
const PEOPLE = ['a', 'b', 'c', 'd'].map((c, i) => ({
  id: c.repeat(64),
  token: String(i + 1).repeat(64),
}))
const [ALI, VELI, AYSE, CAN] = PEOPLE
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
const get = (p: { id: string; token: string }, query: string) => access.GET(new Request(`https://app.test/api/access?${query}`, { headers: as(p) }))
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

describe('reporting and blocking a friend', () => {
  it('a reported message is kept and mailed as the server has it, whatever the reporter claims it said', async () => {
    const aliCode = await publish(ALI, 'Ali')
    await publish(VELI, 'Veli')
    await post(VELI, { action: 'friends-add', code: aliCode })
    const text = {
      language: 'fr',
      title: 'Bonjour',
      body: 'Un texte assez long pour être envoyé à un ami, vraiment.',
    }
    expect(
      (
        await post(VELI, {
          action: 'friends-send',
          code: aliCode,
          kind: 'text',
          payload: text,
        })
      ).status,
    ).toBe(200)
    const { items } = (await (await get(ALI, 'inbox=1')).json()) as {
      items: { id: string }[]
    }

    const res = await post(ALI, {
      action: 'report',
      kind: 'message',
      target: items[0].id,
      reason: 'harassment',
      note: 'Beni <i>rahatsız</i> ediyor',
      shown: 'something else',
    })
    expect(res.status).toBe(200)
    const [r] = reports()
    expect(r).toMatchObject({
      kind: 'message',
      reason: 'harassment',
      reporter: ALI.id,
      note: 'Beni <i>rahatsız</i> ediyor',
      about: { owner: VELI.id, name: 'Veli' },
    })
    expect(r.content).toContain('Un texte assez long')
    expect(r.content).not.toContain('something else')
    expect(mails).toHaveLength(1)
    expect(mails[0].to).toEqual(['owner@example.com'])
    expect(mails[0].subject).toContain('Taciz')
    expect(mails[0].html).toContain('Un texte assez long')
    expect(mails[0].html).toContain('Beni &lt;i&gt;rahatsız&lt;/i&gt; ediyor')
    expect(mails[0].html).not.toContain('<i>rahatsız</i>')
  })

  it('blocking takes the friend off both ways, clears what they sent and keeps them out; lifting it lets them ask again', async () => {
    const aliCode = await publish(ALI, 'Ali')
    const veliCode = await publish(VELI, 'Veli')
    await post(VELI, { action: 'friends-add', code: aliCode })
    await post(VELI, { action: 'friends-send', code: aliCode, kind: 'cheer' })
    expect((await post(ALI, { action: 'friends-block', code: veliCode })).status).toBe(200)

    expect(((await (await get(ALI, 'inbox=1')).json()) as { items: unknown[] }).items).toEqual([])
    expect(
      (
        (await (await get(ALI, 'friends=1&today=2026-10-28')).json()) as {
          friends: unknown[]
        }
      ).friends,
    ).toEqual([])
    expect(
      (
        (await (await get(VELI, 'friends=1&today=2026-10-28')).json()) as {
          friends: unknown[]
        }
      ).friends,
    ).toEqual([])
    expect(await (await post(VELI, { action: 'friends-add', code: aliCode })).json()).toEqual({ error: 'unknown' })
    expect(
      (
        await post(VELI, {
          action: 'friends-send',
          code: aliCode,
          kind: 'cheer',
        })
      ).status,
    ).toBe(403)

    const { people } = (await (await get(ALI, 'blocked=1')).json()) as {
      people: { code: string; name: string }[]
    }
    expect(people).toEqual([expect.objectContaining({ code: veliCode, name: 'Veli' })])
    expect(JSON.stringify(people)).not.toContain(VELI.id)

    await post(ALI, { action: 'friends-unblock', code: veliCode })
    expect(((await (await get(ALI, 'blocked=1')).json()) as { people: unknown[] }).people).toEqual([])
    expect((await post(VELI, { action: 'friends-add', code: aliCode })).status).toBe(200)
  })

  it('a person can be reported by their code; an unknown target, kind or reason is refused', async () => {
    const veliCode = await publish(VELI, 'Veli')
    expect(
      (
        await post(ALI, {
          action: 'report',
          kind: 'user',
          target: veliCode.toLowerCase(),
          reason: 'spam',
        })
      ).status,
    ).toBe(200)
    expect(reports()[0]).toMatchObject({
      kind: 'user',
      target: veliCode,
      about: { owner: VELI.id, name: 'Veli' },
    })
    expect(
      (
        await post(ALI, {
          action: 'report',
          kind: 'user',
          target: 'ZZZZZZZZ',
          reason: 'spam',
        })
      ).status,
    ).toBe(404)
    expect(
      (
        await post(ALI, {
          action: 'report',
          kind: 'message',
          target: 'nope',
          reason: 'spam',
        })
      ).status,
    ).toBe(404)
    expect(
      (
        await post(ALI, {
          action: 'report',
          kind: 'user',
          target: veliCode,
          reason: 'boring',
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await post(ALI, {
          action: 'report',
          kind: 'everything',
          target: veliCode,
          reason: 'spam',
        })
      ).status,
    ).toBe(400)
  })

  it('a reading club room is reported with what the reporter saw, as plain text', async () => {
    expect(
      (
        await post(ALI, {
          action: 'report',
          kind: 'club',
          target: 'abcdef',
          reason: 'sexual',
          shown: 'Oda: ABCDEF\u202e · Ev sahibi: X\u0000\nMetin: “Le chat”',
        })
      ).status,
    ).toBe(200)
    expect(reports()[0]).toMatchObject({
      kind: 'club',
      target: 'ABCDEF',
      content: 'Oda: ABCDEF · Ev sahibi: X \nMetin: “Le chat”',
    })
  })

  it(`a person files at most ${REPORTS_A_DAY} reports a day`, async () => {
    const veliCode = await publish(VELI, 'Veli')
    for (let i = 0; i < REPORTS_A_DAY; i++) {
      resetRate()
      expect(
        (
          await post(ALI, {
            action: 'report',
            kind: 'user',
            target: veliCode,
            reason: 'spam',
          })
        ).status,
      ).toBe(200)
    }
    resetRate()
    expect(
      (
        await post(ALI, {
          action: 'report',
          kind: 'user',
          target: veliCode,
          reason: 'spam',
        })
      ).status,
    ).toBe(429)
  })

  it('needs an account', async () => {
    const res = await access.POST(
      new Request('https://app.test/api/access', {
        method: 'POST',
        headers: { 'sec-fetch-site': 'same-origin' },
        body: JSON.stringify({
          action: 'report',
          kind: 'club',
          target: 'ABCDEF',
          reason: 'spam',
        }),
      }),
    )
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(reports()).toEqual([])
  })
})

describe('reporting a community library list', () => {
  const LIST = 'f'.repeat(32)
  beforeEach(() => {
    const now = '2026-10-28T10:00:00.000Z'
    set(`share/${LIST}.json`, {
      v: 1,
      kind: 'set',
      owner: ALI.id,
      name: 'Kötü liste',
      language: 'fr',
      words: [{ key: 'k', word: 'mot', meaning: 'kelime', at: now }],
      createdAt: now,
      updatedAt: now,
    })
    set('share/library.json', [{ id: LIST, name: 'Kötü liste', language: 'fr', count: 1, at: now }])
  })
  const inLibrary = () => (read('share/library.json') as unknown as { id: string }[]).some((x) => x.id === LIST)

  it(`leaves the library once ${HIDE_AFTER} different people report it; one person twice and the owner do not count`, async () => {
    expect(HIDE_AFTER).toBe(3)
    await post(ALI, {
      action: 'report',
      kind: 'set',
      target: LIST,
      reason: 'spam',
    }) // the owner
    await post(VELI, {
      action: 'report',
      kind: 'set',
      target: LIST,
      reason: 'spam',
    })
    await post(VELI, {
      action: 'report',
      kind: 'set',
      target: LIST,
      reason: 'spam',
    })
    await post(AYSE, {
      action: 'report',
      kind: 'set',
      target: LIST,
      reason: 'sexual',
    })
    expect(inLibrary()).toBe(true)
    await post(CAN, {
      action: 'report',
      kind: 'set',
      target: LIST,
      reason: 'sexual',
    })
    expect(inLibrary()).toBe(false)
    // The list itself stays for the owner to look at; the last report and its mail say it went.
    expect(blobs.has(`share/${LIST}.json`)).toBe(true)
    expect(reports().filter((r) => r.hidden)).toHaveLength(1)
    expect(mails.at(-1)!.text).toContain('kendiliğinden kaldırıldı')
    expect(mails.at(-1)!.text).toContain('mot = kelime')
    // The count is kept by hashes, never the reporters' ids.
    expect(JSON.stringify(read(`reports/sets/${LIST}.json`))).not.toContain(VELI.id)
  })
})
