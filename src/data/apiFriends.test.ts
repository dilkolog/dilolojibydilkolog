import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

// An in-memory Blob store behind the real /api/access handlers.
const blobs = new Map<string, Uint8Array>()
const etags = new Map<string, string>()
let version = 0
/** Runs once, between a read and the write that follows it: another server instance writing in that gap. */
let betweenReadAndWrite: (() => void) | null = null
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: string, opts: { allowOverwrite?: boolean; ifMatch?: string }) => {
    const gap = betweenReadAndWrite
    betweenReadAndWrite = null
    gap?.()
    if (opts.allowOverwrite === false && blobs.has(path)) throw new Error('exists')
    if (opts.ifMatch && etags.get(path) !== opts.ifMatch) throw Object.assign(new Error('precondition'), { name: 'BlobPreconditionFailedError' })
    blobs.set(path, new TextEncoder().encode(body))
    etags.set(path, `"v${++version}"`)
    return {}
  },
  get: async (path: string) => {
    const b = blobs.get(path)
    return b ? { statusCode: 200, stream: new Response(b.slice()).body, blob: { etag: etags.get(path) ?? '"v0"' } } : null
  },
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })) }),
  del: async (path: string) => void blobs.delete(path),
}))

const pushed: { endpoint: string; body: string }[] = []
const expired = new Set<string>()
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: () => {},
    sendNotification: async (sub: { endpoint: string }, body: string) => {
      if (expired.has(sub.endpoint)) throw Object.assign(new Error('gone'), { statusCode: 410 })
      pushed.push({ endpoint: sub.endpoint, body })
    },
  },
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
  etags.clear()
  betweenReadAndWrite = null
  pushed.length = 0
  expired.clear()
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

  it('resolves account username when card name is empty or "Arkadaş"', async () => {
    set(`access/approved/${ALI}.json`, JSON.stringify({ username: 'AliVeli' }))
    const pub = await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card, name: '' })
    expect(pub.status).toBe(200)
    const { me } = (await pub.json()) as { me: { code: string; name: string } }
    expect(me.name).toBe('AliVeli')

    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: me.code })
    const res = await view(as(VELI, VELI_TOKEN))
    const body = (await res.json()) as { friends: { name: string }[] }
    expect(body.friends[0].name).toBe('AliVeli')
  })
})

describe('/api/access: friends inbox and days', () => {
  const inbox = (headers: Record<string, string>) => access.GET(new Request('https://app.test/api/access?inbox=1', { headers }))
  const publish = async (id: string, token: string, extra = {}) => ((await (await post(as(id, token), { action: 'friends-publish', ...card, ...extra })).json()) as { me: { code: string } }).me.code

  it('a friend\'s view carries the card\'s days (none newer than today)', async () => {
    const code = await publish(ALI, ALI_TOKEN, { days: { '2026-10-15': 40, '2026-10-12': 60, '2026-10-20': 99 } })
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code })
    const body = (await (await view(as(VELI, VELI_TOKEN))).json()) as { friends: { days: Record<string, number> }[] }
    expect(body.friends[0].days).toEqual({ '2026-10-15': 40, '2026-10-12': 60 })
  })

  it('a cheer reaches the friend with the sender\'s name and code, never an id; a second one a day replaces the first', async () => {
    const aliCode = await publish(ALI, ALI_TOKEN)
    const veliCode = await publish(VELI, VELI_TOKEN, { name: 'Veli' })
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: aliCode })
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'cheer' })).status).toBe(200)
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'cheer' })).status).toBe(200)
    const body = (await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: { id: string; kind: string; from: { code: string; name: string } }[] }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({ kind: 'cheer', from: { code: aliCode, name: 'Ali' } })
    expect(JSON.stringify(body)).not.toContain(ALI)
    // Another kind is another message; clearing takes them out.
    await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'nudge' })
    const two = (await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: { id: string }[] }
    expect(two.items).toHaveLength(2)
    await post(as(VELI, VELI_TOKEN), { action: 'friends-inbox-clear', ids: [two.items[0].id] })
    expect(((await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: unknown[] }).items).toHaveLength(1)
  })

  it('"joined" tells the one who invited, replacing the same friend\'s earlier one at any time, and reaches only friends', async () => {
    const aliCode = await publish(ALI, ALI_TOKEN)
    const veliCode = await publish(VELI, VELI_TOKEN, { name: 'Veli' })
    // Not friends yet: refused.
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-send', code: aliCode, kind: 'joined' })).status).not.toBe(200)
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: aliCode })
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-send', code: aliCode, kind: 'joined' })).status).toBe(200)
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-send', code: aliCode, kind: 'joined' })).status).toBe(200)
    const body = (await (await inbox(as(ALI, ALI_TOKEN))).json()) as { items: { kind: string; from: { code: string; name: string } }[] }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({ kind: 'joined', from: { code: veliCode, name: 'Veli' } })
  })

  it('a message also arrives as a push notification, on the devices of the account that asked for it', async () => {
    vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key')
    const aliCode = await publish(ALI, ALI_TOKEN)
    const veliCode = await publish(VELI, VELI_TOKEN, { name: 'Veli' })
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: aliCode })
    const record = (endpoint: string, extra: object) => JSON.stringify({ subscription: { endpoint, keys: { p256dh: 'p', auth: 'a' } }, tz: 0, studiedDay: null, streak: 0, plan: '', group: null, ...extra })
    // Veli: one phone that asked, one that did not, one that has expired. Ali's own phone is not Veli's.
    set(`push/${'1'.repeat(40)}.json`, record('https://fcm.googleapis.com/fcm/send/yes', { owner: VELI, friends: true }))
    set(`push/${'2'.repeat(40)}.json`, record('https://fcm.googleapis.com/fcm/send/no', { owner: VELI, friends: false }))
    set(`push/${'3'.repeat(40)}.json`, record('https://fcm.googleapis.com/fcm/send/old', { owner: VELI, friends: true }))
    set(`push/${'4'.repeat(40)}.json`, record('https://fcm.googleapis.com/fcm/send/ali', { owner: ALI, friends: true }))
    set(`push/${'5'.repeat(40)}.json`, record('https://fcm.googleapis.com/fcm/send/anonymous', {}))
    expired.add('https://fcm.googleapis.com/fcm/send/old')
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'cheer' })).status).toBe(200)
    expect(pushed.map((p) => p.endpoint)).toEqual(['https://fcm.googleapis.com/fcm/send/yes'])
    expect(JSON.parse(pushed[0].body)).toEqual({ title: 'Diloloji', body: '👏 Ali seni tebrik etti', url: '/', kind: 'friend' })
    // The expired address is dropped; the message is in the inbox in any case.
    expect(blobs.has(`push/${'3'.repeat(40)}.json`)).toBe(false)
    expect(((await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: unknown[] }).items).toHaveLength(1)
  })

  it('a push that cannot be sent (no key, a store failing) does not undo the message', async () => {
    const aliCode = await publish(ALI, ALI_TOKEN)
    const veliCode = await publish(VELI, VELI_TOKEN, { name: 'Veli' })
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: aliCode })
    set(`push/${'1'.repeat(40)}.json`, JSON.stringify({ subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/yes', keys: { p256dh: 'p', auth: 'a' } }, owner: VELI, friends: true, tz: 0, studiedDay: null, streak: 0, plan: '', group: null }))
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'nudge' })).status).toBe(200)
    expect(pushed).toEqual([])
    expect(((await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: unknown[] }).items).toHaveLength(1)
  })

  it('refuses a stranger, an unknown code, one\'s own code and an unknown kind', async () => {
    const aliCode = await publish(ALI, ALI_TOKEN)
    const veliCode = await publish(VELI, VELI_TOKEN)
    // Not friends yet.
    expect(await (await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'cheer' })).json()).toEqual({ error: 'not_friends' })
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: aliCode })
    expect(await (await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: 'ZZZZZZZZ', kind: 'cheer' })).json()).toEqual({ error: 'unknown' })
    expect(await (await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: aliCode, kind: 'cheer' })).json()).toEqual({ error: 'self' })
    expect(await (await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'spam' })).json()).toEqual({ error: 'bad_kind' })
    expect(((await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: unknown[] }).items).toEqual([])
  })

  it('a word gift and a text travel with their content, trimmed; bad ones are refused; a sender\'s waiting gifts are capped', async () => {
    const aliCode = await publish(ALI, ALI_TOKEN)
    const veliCode = await publish(VELI, VELI_TOKEN)
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: aliCode })
    const gift = { language: 'fr', lemma: '<b>maison</b>', meaning: 'ev', example: 'La maison est grande.', exampleTranslation: 'Ev büyük.' }
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'gift', payload: gift })).status).toBe(200)
    const body = 'Il fait beau aujourd\'hui. Nous allons au marché.\nOn achète des pommes.'
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'text', payload: { language: 'fr', title: 'Au marché', body } })).status).toBe(200)
    const got = (await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: { kind: string; gift?: { lemma: string; example?: string }; text?: { body: string } }[] }
    expect(got.items.map((i) => i.kind).sort()).toEqual(['gift', 'text'])
    expect(got.items.find((i) => i.kind === 'gift')!.gift).toMatchObject({ lemma: 'bmaison/b', meaning: 'ev', example: 'La maison est grande.' })
    expect(got.items.find((i) => i.kind === 'text')!.text!.body).toContain('\n')
    // No meaning, an unknown language, a text too short: refused.
    for (const payload of [{ language: 'fr', lemma: 'x', meaning: '' }, { language: 'de', lemma: 'x', meaning: 'y' }, undefined]) {
      expect(await (await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'gift', payload })).json()).toEqual({ error: 'bad_payload' })
    }
    expect(await (await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'text', payload: { language: 'fr', title: 'x', body: 'court' } })).json()).toEqual({ error: 'bad_payload' })
    // Only a few gifts wait from one sender.
    for (let i = 0; i < 8; i++) await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'gift', payload: { ...gift, lemma: `mot${i}` } })
    const many = (await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: { kind: string; gift?: { lemma: string } }[] }
    const gifts = many.items.filter((i) => i.kind === 'gift')
    expect(gifts).toHaveLength(5)
    expect(gifts[0].gift!.lemma).toBe('mot7')
  })

  it('a nudge goes only to a friend who has not studied that day (by the sender\'s date)', async () => {
    const aliCode = await publish(ALI, ALI_TOKEN)
    const veliCode = await publish(VELI, VELI_TOKEN, { days: { '2026-10-15': 80 } })
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: aliCode })
    const nudge = (today?: string) => post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'nudge', ...(today ? { today } : {}) })
    expect(await (await nudge('2026-10-15')).json()).toEqual({ error: 'studied' })
    expect(((await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: unknown[] }).items).toEqual([])
    // Another day for the sender (an hour ahead of the server's): nobody has studied it yet.
    expect((await nudge('2026-10-16')).status).toBe(200)
    // A cheer is not a nudge: it goes whatever the day was.
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'cheer' })).status).toBe(200)
  })

  it('messages sent at the same moment are all kept, and a clearing does not bring back what it took out', async () => {
    const aliCode = await publish(ALI, ALI_TOKEN)
    const veliCode = await publish(VELI, VELI_TOKEN)
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: aliCode })
    const gift = (n: number) => ({ language: 'fr', lemma: `mot${n}`, meaning: 'sözcük' })
    await Promise.all([1, 2, 3, 4].map((n) => post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'gift', payload: gift(n) })))
    const first = (await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: { id: string; gift: { lemma: string } }[] }
    expect(first.items.map((i) => i.gift.lemma).sort()).toEqual(['mot1', 'mot2', 'mot3', 'mot4'])
    // One is cleared while another arrives.
    await Promise.all([post(as(VELI, VELI_TOKEN), { action: 'friends-inbox-clear', ids: [first.items[0].id] }), post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'gift', payload: gift(5) })])
    const last = (await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: { id: string; gift: { lemma: string } }[] }
    expect(last.items).toHaveLength(4)
    expect(last.items.some((i) => i.id === first.items[0].id)).toBe(false)
    expect(last.items.some((i) => i.gift.lemma === 'mot5')).toBe(true)
  })

  it('a message written by another server instance between the read and the write is not undone', async () => {
    const aliCode = await publish(ALI, ALI_TOKEN)
    const veliCode = await publish(VELI, VELI_TOKEN)
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: aliCode })
    const gift = (n: number) => ({ language: 'fr', lemma: `mot${n}`, meaning: 'sözcük' })
    await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'gift', payload: gift(1) })
    const path = `friends/inbox/${VELI}.json`
    const other = { id: 'from-elsewhere', kind: 'cheer', from: { code: 'ZZZZZZZZ', name: 'Başkası' }, at: new Date().toISOString() }
    // The next write finds the file changed under it: the send reads again and puts its message beside the other one.
    betweenReadAndWrite = () => {
      const now = JSON.parse(new TextDecoder().decode(blobs.get(path)!)) as { items: unknown[] }
      blobs.set(path, new TextEncoder().encode(JSON.stringify({ items: [other, ...now.items] })))
      etags.set(path, `"v${++version}"`)
    }
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'gift', payload: gift(2) })).status).toBe(200)
    const body = (await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: { id: string; gift?: { lemma: string } }[] }
    expect(body.items.map((i) => i.gift?.lemma ?? i.id).sort()).toEqual(['from-elsewhere', 'mot1', 'mot2'])
  })

  it('the first message to an inbox that another instance has just made is kept too', async () => {
    const aliCode = await publish(ALI, ALI_TOKEN)
    const veliCode = await publish(VELI, VELI_TOKEN)
    await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: aliCode })
    const path = `friends/inbox/${VELI}.json`
    const other = { id: 'first-elsewhere', kind: 'cheer', from: { code: 'ZZZZZZZZ', name: 'Başkası' }, at: new Date().toISOString() }
    betweenReadAndWrite = () => {
      blobs.set(path, new TextEncoder().encode(JSON.stringify({ items: [other] })))
      etags.set(path, `"v${++version}"`)
    }
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-send', code: veliCode, kind: 'nudge' })).status).toBe(200)
    const body = (await (await inbox(as(VELI, VELI_TOKEN))).json()) as { items: { id: string; kind: string }[] }
    expect(body.items.map((i) => i.kind).sort()).toEqual(['cheer', 'nudge'])
  })
})

describe('/api/access: finding a friend by a chosen name', () => {
  const inbox = async (headers: Record<string, string>) => ((await (await access.GET(new Request('https://app.test/api/access?inbox=1', { headers }))).json()) as { items: { id: string; kind: string; from: { code: string; name: string } }[] }).items
  const find = (headers: Record<string, string>, name: string) => access.GET(new Request(`https://app.test/api/access?friend-find=${encodeURIComponent(name)}`, { headers }))
  const setName = (headers: Record<string, string>, handle: string, findable: boolean) => post(headers, { action: 'friends-handle', handle, findable })

  it('only an exact name that was switched on can be found; the result carries no id or code', async () => {
    const ali = (await (await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card })).json()) as { me: { code: string } }
    // A name that is picked but not yet on is invisible.
    expect((await setName(as(ALI, ALI_TOKEN), '@Ali_Fr', false)).status).toBe(200)
    expect((await find(as(VELI, VELI_TOKEN), 'ali_fr')).status).toBe(404)
    expect((await setName(as(ALI, ALI_TOKEN), 'ali_fr', true)).status).toBe(200)
    const res = await find(as(VELI, VELI_TOKEN), '@ALI_FR')
    expect(res.status).toBe(200)
    const text = JSON.stringify(await res.json())
    expect(text).toContain('Ali')
    expect(text).not.toContain(ALI)
    expect(text).not.toContain(ali.me.code)
    // No partial match, and not one's own name.
    expect((await find(as(VELI, VELI_TOKEN), 'ali')).status).toBe(404)
    expect((await find(as(ALI, ALI_TOKEN), 'ali_fr')).status).toBe(404)
  })

  it('a name is held by one account, is chosen once (only findability changes) and must be well formed', async () => {
    await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card })
    expect((await setName(as(ALI, ALI_TOKEN), 'ali_fr', true)).status).toBe(200)
    expect((await setName(as(VELI, VELI_TOKEN), 'ali_fr', true)).status).toBe(409)
    expect((await setName(as(VELI, VELI_TOKEN), 'x', true)).status).toBe(400)
    expect((await setName(as(VELI, VELI_TOKEN), 'has space', true)).status).toBe(400)
    expect((await setName(as(VELI, VELI_TOKEN), 'admin', true)).status).toBe(400)
    expect((await setName(as(ALI, ALI_TOKEN), 'ali_es', true)).status).toBe(409)
    expect((await setName(as(ALI, ALI_TOKEN), 'ali_fr', false)).status).toBe(200)
    expect((await setName(as(ALI, ALI_TOKEN), 'ali_fr', true)).status).toBe(200)
    expect((await setName(as(VELI, VELI_TOKEN), 'veli_fr', true)).status).toBe(200)
    const mine = (await (await access.GET(new Request('https://app.test/api/access?friend-handle=1', { headers: as(ALI, ALI_TOKEN) }))).json()) as { handle: string; findable: boolean }
    expect(mine).toEqual({ handle: 'ali_fr', findable: true })
  })

  it('a request waits in the other\'s inbox and adds nothing until it is accepted (by adding the sender\'s code)', async () => {
    const ali = (await (await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card })).json()) as { me: { code: string } }
    const veli = (await (await post(as(VELI, VELI_TOKEN), { action: 'friends-publish', ...card, name: 'Veli' })).json()) as { me: { code: string } }
    await setName(as(ALI, ALI_TOKEN), 'ali_fr', true)
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-request', handle: 'ali_fr' })).status).toBe(200)
    // Asked twice: still one request.
    await post(as(VELI, VELI_TOKEN), { action: 'friends-request', handle: 'ali_fr' })
    const waiting = await inbox(as(ALI, ALI_TOKEN))
    expect(waiting).toEqual([expect.objectContaining({ kind: 'request', from: { code: veli.me.code, name: 'Veli' } })])
    // Not friends yet: Ali sees nobody, Veli does not see Ali's card.
    const before = (await (await view(as(ALI, ALI_TOKEN))).json()) as { friends: unknown[] }
    expect(before.friends).toEqual([])
    const veliBefore = (await (await view(as(VELI, VELI_TOKEN))).json()) as { friends: unknown[] }
    expect(veliBefore.friends).toEqual([])
    // Accepted: the sender's code is added, friendship is mutual.
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-add', code: veli.me.code })).status).toBe(200)
    const after = (await (await view(as(VELI, VELI_TOKEN))).json()) as { friends: { code: string }[] }
    expect(after.friends.map((f) => f.code)).toEqual([ali.me.code])
    // Now they are friends: another request says so.
    const again = await post(as(VELI, VELI_TOKEN), { action: 'friends-request', handle: 'ali_fr' })
    expect(again.status).toBe(400)
    expect(await again.json()).toEqual({ error: 'already' })
  })

  it('refuses a request to an unknown or switched-off name and to oneself; "request" cannot be sent through friends-send', async () => {
    const ali = (await (await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card })).json()) as { me: { code: string } }
    await post(as(VELI, VELI_TOKEN), { action: 'friends-publish', ...card })
    await setName(as(ALI, ALI_TOKEN), 'ali_fr', false)
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-request', handle: 'ali_fr' })).status).toBe(404)
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-request', handle: 'nobody' })).status).toBe(404)
    await setName(as(ALI, ALI_TOKEN), 'ali_fr', true)
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-request', handle: 'ali_fr' })).status).toBe(400)
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-send', code: ali.me.code, kind: 'request' })).status).toBe(400)
  })

  it('deleting the account frees the name', async () => {
    await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card })
    await setName(as(ALI, ALI_TOKEN), 'ali_fr', true)
    const { forgetFriends } = await import('../../api/_friends')
    await forgetFriends(ALI)
    expect((await setName(as(VELI, VELI_TOKEN), 'ali_fr', true)).status).toBe(200)
  })

  it('a stranger cannot ring someone again and again: a repeat request, even after it was turned away, sends nothing', async () => {
    vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key')
    await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card })
    await post(as(VELI, VELI_TOKEN), { action: 'friends-publish', ...card, name: 'Veli' })
    await setName(as(ALI, ALI_TOKEN), 'ali_fr', true)
    set(`push/${'1'.repeat(40)}.json`, JSON.stringify({ subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/ali', keys: { p256dh: 'p', auth: 'a' } }, owner: ALI, friends: true, tz: 0, studiedDay: null, streak: 0, plan: '', group: null }))
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-request', handle: 'ali_fr' })).status).toBe(200)
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-request', handle: 'ali_fr' })).status).toBe(200)
    expect(pushed).toHaveLength(1)
    // Turned away; asked again at once: still nothing.
    const waiting = await inbox(as(ALI, ALI_TOKEN))
    await post(as(ALI, ALI_TOKEN), { action: 'friends-inbox-clear', ids: waiting.map((i) => i.id) })
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-request', handle: 'ali_fr' })).status).toBe(200)
    expect(await inbox(as(ALI, ALI_TOKEN))).toEqual([])
    expect(pushed).toHaveLength(1)
  })

  it('of two accounts claiming one free name at the same moment, only the first holds it', async () => {
    await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card })
    await post(as(VELI, VELI_TOKEN), { action: 'friends-publish', ...card })
    // Veli's claim lands between Ali's check and Ali's write.
    betweenReadAndWrite = () => set('friends/handle/ali_fr.json', JSON.stringify({ id: VELI }))
    expect((await setName(as(ALI, ALI_TOKEN), 'ali_fr', true)).status).toBe(409)
    expect(JSON.parse(new TextDecoder().decode(blobs.get('friends/handle/ali_fr.json')))).toEqual({ id: VELI })
  })

  it('an invite code shows its owner\'s card (no id, no code) before it is accepted; unknown and own codes are refused', async () => {
    const ali = (await (await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card })).json()) as { me: { code: string } }
    await post(as(VELI, VELI_TOKEN), { action: 'friends-publish', ...card, name: 'Veli' })
    const ask = (headers: Record<string, string>, code: string) => access.GET(new Request(`https://app.test/api/access?friend-invite=${code}`, { headers }))
    const res = await ask(as(VELI, VELI_TOKEN), ali.me.code)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { inviter: Record<string, unknown> }
    expect(body.inviter).toEqual({ name: 'Ali', avatar: 'fox', color: '#2f6de6', level: 6 })
    expect(JSON.stringify(body)).not.toContain(ALI)
    expect(JSON.stringify(body)).not.toContain(ali.me.code)
    // Looking is not adding.
    const veli = (await (await view(as(VELI, VELI_TOKEN))).json()) as { friends: unknown[] }
    expect(veli.friends).toEqual([])
    expect((await ask(as(VELI, VELI_TOKEN), 'ZZZZ2222')).status).toBe(404)
    expect((await ask(as(ALI, ALI_TOKEN), ali.me.code)).status).toBe(400)
  })

  it('someone taken off one\'s friends cannot come back with the code or a request, until one adds them again', async () => {
    const ali = (await (await post(as(ALI, ALI_TOKEN), { action: 'friends-publish', ...card })).json()) as { me: { code: string } }
    const veli = (await (await post(as(VELI, VELI_TOKEN), { action: 'friends-publish', ...card, name: 'Veli' })).json()) as { me: { code: string } }
    await setName(as(ALI, ALI_TOKEN), 'ali_fr', true)
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: ali.me.code })).status).toBe(200)
    // Ali takes Veli off.
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-remove', code: veli.me.code })).status).toBe(200)
    // Veli still knows Ali's code: adding it again does nothing, a request is quietly dropped.
    expect(await (await post(as(VELI, VELI_TOKEN), { action: 'friends-add', code: ali.me.code })).json()).toEqual({ error: 'unknown' })
    expect((await post(as(VELI, VELI_TOKEN), { action: 'friends-request', handle: 'ali_fr' })).status).toBe(200)
    expect(await inbox(as(ALI, ALI_TOKEN))).toEqual([])
    const aliView = (await (await view(as(ALI, ALI_TOKEN))).json()) as { friends: unknown[] }
    expect(aliView.friends).toEqual([])
    // Ali changes his mind: adding Veli lifts the block, they are friends again.
    expect((await post(as(ALI, ALI_TOKEN), { action: 'friends-add', code: veli.me.code })).status).toBe(200)
    const veliView = (await (await view(as(VELI, VELI_TOKEN))).json()) as { friends: { code: string }[] }
    expect(veliView.friends.map((f) => f.code)).toEqual([ali.me.code])
  })
})
