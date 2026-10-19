import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PushRecord } from '../../api/push'

// An in-memory Blob store and a recording Resend behind the real handlers.
const blobs = new Map<string, string>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: string) => {
    blobs.set(path, body)
    return {}
  },
  get: async (path: string) => (blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)).body } : null),
  del: async (path: string) => void blobs.delete(path),
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })), hasMore: false }),
}))
vi.mock('web-push', () => ({ default: { setVapidDetails: () => {}, sendNotification: async () => {} } }))

const { POST, GET, mailKey, mailPath } = await import('../../api/push')
const { GET: CRON } = await import('../../api/cron-reminder')
const { clearAccessCache } = await import('../../api/_account')

interface Sent {
  from: string
  to: string[]
  subject: string
  text: string
  html: string
  headers?: Record<string, string>
}
let mails: Sent[] = []
let resendOk = true

const EMAIL = 'ali@example.com'
const state = { tz: -180, streak: 3, due: 12, hour: 20, studiedDay: null, reportedDay: '2026-10-07', plan: 'DELF B2 <script>', week: 'x' }
const post = (body: unknown, headers: Record<string, string> = {}) => POST(new Request('https://app.test/api/push', { method: 'POST', headers, body: JSON.stringify(body) }))
const get = (qs: string) => GET(new Request(`https://app.test/api/push?${qs}`))
const stored = async (email = EMAIL) => JSON.parse(blobs.get(mailPath(await mailKey(email)))!) as PushRecord
const linkOf = (text: string, param: 'c' | 'u') => text.match(new RegExp(`/api/push\\?${param}=([0-9a-f.]+)`))![1]

beforeEach(() => {
  blobs.clear()
  mails = []
  resendOk = true
  clearAccessCache()
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('RESEND_FROM', 'Diloloji <hatirlatma@example.org>')
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    if (url !== 'https://api.resend.com/emails/batch') throw new Error(`unexpected ${url}`)
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer re_test')
    if (!resendOk) return new Response('no', { status: 422 })
    mails.push(...(JSON.parse(init.body as string) as Sent[]))
    return new Response('{}')
  })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('registering an address', () => {
  it('is off (503) while the mail key is not set, and says whether it is available', async () => {
    expect(await (await get('mail=status')).json()).toEqual({ available: true, sandbox: false })
    vi.stubEnv('RESEND_API_KEY', '')
    expect(await (await get('mail=status')).json()).toEqual({ available: false, sandbox: false })
    expect((await post({ action: 'email', email: EMAIL, ...state })).status).toBe(503)
    expect(blobs.size).toBe(0)
  })

  it('says so while mails still go out from Resend\'s test sender (they land in spam)', async () => {
    vi.stubEnv('RESEND_FROM', '')
    expect(await (await get('mail=status')).json()).toEqual({ available: true, sandbox: true })
    vi.stubEnv('RESEND_FROM', 'Diloloji <onboarding@resend.dev>')
    expect((await (await get('mail=status')).json()).sandbox).toBe(true)
    vi.stubEnv('RESEND_FROM', 'Diloloji <hatirlatma@example.org>')
    expect((await (await get('mail=status')).json()).sandbox).toBe(false)
  })

  it('refuses a bad address', async () => {
    for (const email of ['', 'nope', 'a@b', 'a b@c.de', 'x@y.z', `${'a'.repeat(250)}@b.de`]) expect((await post({ action: 'email', email, ...state })).status).toBe(400)
    expect(mails).toEqual([])
  })

  it('keeps the address pending and sends one confirmation mail, from the verified sender', async () => {
    const res = await post({ action: 'email', email: EMAIL, ...state })
    expect(await res.json()).toEqual({ state: 'pending' })
    expect(mails).toHaveLength(1)
    expect(mails[0]).toMatchObject({ from: 'Diloloji <hatirlatma@example.org>', to: [EMAIL], subject: 'Diloloji hatırlatmalarını onayla' })
    expect(mails[0].text).toContain('/api/push?c=')
    const record = await stored()
    expect(record).toMatchObject({ email: EMAIL, confirmed: false, streak: 3, due: 12, hour: 20 })
    // The address is not in the path, and the typed plan is not kept.
    expect([...blobs.keys()][0]).not.toContain('ali')
    expect(record.plan).toBe('')
  })

  it('links to the site the learner registered from (each site has its own data)', async () => {
    await post({ action: 'email', email: EMAIL, ...state }, { origin: 'https://diloloji.com' })
    expect(mails[0].text).toContain('https://diloloji.com/api/push?c=')
    expect(mails[0].text).toContain('https://diloloji.com/api/push?u=')
    expect((await stored()).site).toBe('https://diloloji.com')
    // Opened on that site, the page leads back to it.
    const page = await GET(new Request(`https://diloloji.com/api/push?c=${linkOf(mails[0].text, 'c')}`))
    expect(await page.text()).toContain('href="https://diloloji.com"')
  })

  it('an unknown origin falls back to the default site, never to what the caller sent', async () => {
    await post({ action: 'email', email: EMAIL, ...state }, { origin: 'https://evil.example' })
    expect(mails[0].text).toContain('https://diloloji.com/api/push?c=')
    expect(mails[0].text).not.toContain('evil.example')
    expect((await stored()).site).toBe('https://diloloji.com')
  })

  it('a second call neither mails again nor changes the status, but updates the day', async () => {
    await post({ action: 'email', email: EMAIL, ...state })
    const again = await post({ action: 'email', email: EMAIL, ...state, streak: 9, update: true })
    expect(await again.json()).toEqual({ state: 'pending' })
    expect(mails).toHaveLength(1)
    expect((await stored()).streak).toBe(9)
    // A silent update for an address nobody registered makes nothing.
    expect(await (await post({ action: 'email', email: 'other@example.com', ...state, update: true })).json()).toEqual({ state: 'none' })
    expect(blobs.size).toBe(1)
  })

  it('sends the confirmation again only when asked, and not within the hour', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.UTC(2026, 9, 7, 10))
    await post({ action: 'email', email: EMAIL, ...state })
    await post({ action: 'email', email: EMAIL, ...state, resend: true })
    expect(mails).toHaveLength(1)
    vi.setSystemTime(Date.UTC(2026, 9, 7, 11, 5))
    await post({ action: 'email', email: EMAIL, ...state, resend: true })
    expect(mails).toHaveLength(2)
  })

  it('a failed send leaves nothing registered', async () => {
    resendOk = false
    expect((await post({ action: 'email', email: EMAIL, ...state })).status).toBe(502)
    expect(blobs.size).toBe(0)
  })

  it('an address registered by another account is not touched (409)', async () => {
    await post({ action: 'email', email: EMAIL, ...state })
    const key = mailPath(await mailKey(EMAIL))
    blobs.set(key, JSON.stringify({ ...(await stored()), owner: 'f'.repeat(64) }))
    expect((await post({ action: 'email', email: EMAIL, ...state })).status).toBe(409)
    expect((await post({ action: 'email-remove', email: EMAIL })).status).toBe(409)
    expect(blobs.has(key)).toBe(true)
  })

  it('reports its status and takes the address out on request', async () => {
    expect(await (await post({ action: 'email-status', email: EMAIL })).json()).toEqual({ state: 'none' })
    await post({ action: 'email', email: EMAIL, ...state })
    expect(await (await post({ action: 'email-status', email: EMAIL })).json()).toEqual({ state: 'pending' })
    // Still waiting and the confirmation just went out: taking it out and putting it in again must not send another.
    expect((await post({ action: 'email-remove', email: EMAIL })).status).toBe(204)
    expect(blobs.size).toBe(1)
    await post({ action: 'email', email: EMAIL, ...state })
    expect(mails).toHaveLength(1)
    // After the hour it goes; a confirmed address goes at once.
    const key = [...blobs.keys()][0]
    blobs.set(key, JSON.stringify({ ...JSON.parse(blobs.get(key)!), confirmSentAt: Date.now() - 2 * 3_600_000 }))
    expect((await post({ action: 'email-remove', email: EMAIL })).status).toBe(204)
    expect(blobs.size).toBe(0)
  })
})

describe('the links in the mails', () => {
  it('confirm turns the address on, with a page; a wrong token does nothing', async () => {
    await post({ action: 'email', email: EMAIL, ...state })
    const token = linkOf(mails[0].text, 'c')
    // A different last character (the random token may itself end in 0).
    expect((await get(`c=${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`)).status).toBe(404)
    expect((await stored()).confirmed).toBe(false)
    const res = await get(`c=${token}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect((await stored()).confirmed).toBe(true)
    expect(await (await post({ action: 'email-status', email: EMAIL })).json()).toEqual({ state: 'on' })
    expect((await get('c=nonsense')).status).toBe(400)
  })

  it('unsubscribe deletes the address, from a page and from a mail client’s one-click POST', async () => {
    await post({ action: 'email', email: EMAIL, ...state })
    const token = linkOf(mails[0].text, 'u')
    expect((await get(`u=${token}`)).status).toBe(200)
    expect(blobs.size).toBe(0)
    await post({ action: 'email', email: EMAIL, ...state })
    const second = linkOf(mails[1].text, 'u')
    const res = await POST(new Request(`https://app.test/api/push?u=${second}`, { method: 'POST', body: 'List-Unsubscribe=One-Click' }))
    expect(res.status).toBe(204)
    expect(blobs.size).toBe(0)
  })
})

describe('the daily mail', () => {
  // 2026-10-07 17:00 UTC = 20:00 in Turkey.
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    vi.stubEnv('VAPID_PRIVATE_KEY', '')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.UTC(2026, 9, 7, 17))
  })
  const run = () => CRON(new Request('https://app.test/api/cron-reminder', { headers: { authorization: 'Bearer s3cret' } }))
  const register = async (email: string, over: Record<string, unknown> = {}, confirm = true) => {
    mails.length = 0
    await post({ action: 'email', email, ...state, ...over })
    if (confirm) await get(`c=${linkOf(mails[0].text, 'c')}`)
    mails.length = 0
  }

  it('goes to a confirmed address at its hour, with numbers and a link, not what was typed', async () => {
    await register(EMAIL, { studiedDay: '2026-10-06' })
    const res = await run()
    expect(await res.json()).toMatchObject({ mailed: 1 })
    expect(mails).toHaveLength(1)
    const mail = mails[0]
    expect(mail).toMatchObject({ to: [EMAIL], subject: 'Diloloji: bugünkü çalışman seni bekliyor' })
    expect(mail.text).toContain('🔥 3 günlük serin var.')
    expect(mail.text).toContain('12 kelimen solmak üzere')
    expect(mail.text + mail.html).not.toContain('DELF')
    expect(mail.text + mail.html).not.toContain('<script>')
    const token = linkOf(mail.text, 'u')
    expect(mail.headers).toEqual({ 'List-Unsubscribe': expect.stringContaining(token), 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' })
  })

  it('keeps to the site the address was registered from: the button and the unsubscribe link', async () => {
    mails.length = 0
    await post({ action: 'email', email: EMAIL, ...state, studiedDay: '2026-10-06' }, { origin: 'https://diloloji.com' })
    await get(`c=${linkOf(mails[0].text, 'c')}`)
    mails.length = 0
    await run()
    expect(mails[0].text).toContain('Başla: https://diloloji.com/?go=quick')
    expect(mails[0].text).toContain('https://diloloji.com/api/push?u=')
    expect(mails[0].html).toContain('href="https://diloloji.com/?go=quick"')
  })

  it('not to an address nobody confirmed, nor to one that studied or rests today', async () => {
    await register('pending@example.com', {}, false)
    await register('studied@example.com', { studiedDay: '2026-10-07' })
    await register('rest@example.com', { restWeekdays: [3] })
    await register('later@example.com', { hour: 9 })
    expect(await (await run()).json()).toMatchObject({ mailed: 0 })
    expect(mails).toEqual([])
  })

  it('without the Resend key the cron still answers for push alone, and says 503 when neither is set', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    expect((await run()).status).toBe(503)
    vi.stubEnv('VAPID_PRIVATE_KEY', 'k')
    expect((await run()).status).toBe(200)
  })
})

describe('how the mails are built', () => {
  it('has a plain-text twin, a visible fallback address, an inbox preview line and escaped content', async () => {
    const { confirmMail, reminderMail } = await import('../../api/_mail')
    const confirm = confirmMail('a&b@example.org', 'https://app.test/api/push?c=k.t', 'https://app.test/api/push?u=k.t')
    expect(confirm.html).toContain('a&amp;b@example.org')
    expect(confirm.html).not.toContain('a&b@example.org')
    // The address is printed under the button, for clients that block or strip the button.
    expect(confirm.html.split('https://app.test/api/push?c=k.t').length).toBeGreaterThanOrEqual(3)
    expect(confirm.html).toContain('display:none')
    expect(confirm.html).toContain('<title>')
    expect(confirm.text).toContain('https://app.test/api/push?c=k.t')
    expect(confirm.unsubscribe).toBe('https://app.test/api/push?u=k.t')
    const reminder = reminderMail('a@example.org', '🔥 3 günlük serin var.', 'https://app.test/api/push?u=k.t')
    expect(reminder.html).toContain('3 günlük serin var.')
    expect(reminder.html).not.toContain('<script')
  })
})
