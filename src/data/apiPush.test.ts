import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PushRecord } from '../../api/push'

// An in-memory Blob store and a recording web-push behind the real handlers.
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
const sent: { endpoint: string; body: string }[] = []
const gone = new Set<string>()
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: () => {},
    sendNotification: async (sub: { endpoint: string }, body: string) => {
      if (gone.has(sub.endpoint)) throw Object.assign(new Error('gone'), { statusCode: 410 })
      sent.push({ endpoint: sub.endpoint, body })
    },
  },
}))

const { POST, recordPath } = await import('../../api/push')
const { GET: CRON, dueNow, localHour, reminderText, resting, weeklyText } = await import('../../api/cron-reminder')

const sub = (endpoint = 'https://push.example/1') => ({ endpoint, keys: { p256dh: 'p', auth: 'a' } })
const post = (body: unknown) => POST(new Request('https://app.test/api/push', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }))
const stored = async (endpoint: string) => JSON.parse(blobs.get(await recordPath(endpoint))!) as PushRecord

beforeEach(() => {
  blobs.clear()
  sent.length = 0
  gone.clear()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('/api/push', () => {
  it('refuses bad JSON, oversized bodies and malformed subscriptions', async () => {
    expect((await post('{nope')).status).toBe(400)
    expect((await post('x'.repeat(4001))).status).toBe(413)
    expect((await post({ action: 'save' })).status).toBe(400)
    expect((await post({ action: 'save', subscription: { endpoint: 'http://insecure', keys: { p256dh: 'p', auth: 'a' } } })).status).toBe(400)
    expect((await post({ action: 'save', subscription: { endpoint: 'https://x', keys: {} } })).status).toBe(400)
    expect((await post({ action: 'remove' })).status).toBe(400)
    expect(blobs.size).toBe(0)
  })

  it('saves a record with every field checked and clamped', async () => {
    const res = await post({
      action: 'save',
      subscription: { ...sub(), extra: 'dropped' },
      tz: 99999,
      studiedDay: '2026-10-07',
      streak: -3,
      plan: 'p'.repeat(300),
      group: 'not-hex',
      restWeekdays: [0, 6, 7, 1.5, 'x'],
      vacation: { from: '2026-12-01', to: 'soon' },
      due: 5000,
      reportedDay: 'yesterday',
      hour: 25,
    })
    expect(res.status).toBe(204)
    const r = await stored(sub().endpoint)
    expect(r).toEqual({
      subscription: sub(),
      tz: 840,
      studiedDay: '2026-10-07',
      streak: 0,
      plan: 'p'.repeat(200),
      group: null,
      restWeekdays: [0, 6],
      vacation: null,
      due: 999,
      reportedDay: null,
      week: '',
      hour: 20,
    })
  })

  it('with SYNC_ALLOWED set, saves only for a listed account or code, and still removes', async () => {
    const listed = 'a'.repeat(64)
    vi.stubEnv('SYNC_ALLOWED', listed)
    expect((await post({ action: 'save', subscription: sub(), tz: -180 })).status).toBe(403)
    expect((await post({ action: 'save', subscription: sub(), tz: -180, group: 'b'.repeat(64) })).status).toBe(403)
    expect(blobs.size).toBe(0)
    expect((await post({ action: 'save', subscription: sub(), tz: -180, group: listed })).status).toBe(204)
    expect((await post({ action: 'remove', endpoint: sub().endpoint })).status).toBe(204)
    expect(blobs.size).toBe(0)
  })

  it('stores under a hash of the endpoint and removes on request', async () => {
    await post({ action: 'save', subscription: sub(), tz: -180 })
    const path = await recordPath(sub().endpoint)
    expect(path).toMatch(/^push\/[0-9a-f]{40}\.json$/)
    expect(path).not.toContain('example')
    expect((await post({ action: 'remove', endpoint: sub().endpoint })).status).toBe(204)
    expect(blobs.size).toBe(0)
  })
})

const record = (over: Partial<PushRecord> = {}): PushRecord => ({ subscription: sub(), tz: -180, studiedDay: null, streak: 0, plan: '', group: null, ...over })
// 2026-10-07 17:00 UTC = 20:00 in Turkey (tz -180), a Wednesday.
const NOW = Date.UTC(2026, 9, 7, 17)

describe('reminder text and rest days', () => {
  it('mentions a streak only when it is still alive, and the due count when it is fresh', () => {
    expect(reminderText(record(), NOW)).toBe('Bugünkü kelime çalışman seni bekliyor.')
    expect(reminderText(record({ streak: 4, studiedDay: '2026-10-06' }), NOW)).toContain('🔥 4 günlük serin var.')
    expect(reminderText(record({ streak: 4, studiedDay: '2026-10-04' }), NOW)).not.toContain('🔥')
    expect(reminderText(record({ due: 12, reportedDay: '2026-10-06' }), NOW)).toContain('🌱 12 kelimen solmak üzere: 4 dakikalık')
    expect(reminderText(record({ due: 12, reportedDay: '2026-10-01' }), NOW)).not.toContain('🌱')
    expect(reminderText(record({ plan: 'DELF B2' }), NOW)).toMatch(/^DELF B2: /)
  })

  it('uses the learner’s own day: just past midnight in Turkey is already tomorrow', () => {
    const lateUtc = Date.UTC(2026, 9, 7, 21, 30) // 00:30 on the 8th in Turkey
    expect(reminderText(record({ streak: 2, studiedDay: '2026-10-07' }), lateUtc)).toContain('🔥')
  })

  it('rests on chosen weekdays and during a holiday', () => {
    expect(resting(record({ restWeekdays: [3] }), NOW)).toBe(true)
    expect(resting(record({ restWeekdays: [0, 6] }), NOW)).toBe(false)
    expect(resting(record({ vacation: { from: '2026-10-05', to: '2026-10-07' } }), NOW)).toBe(true)
    expect(resting(record({ vacation: { from: '2026-10-08', to: '2026-10-10' } }), NOW)).toBe(false)
  })
})

describe('the week on Sunday', () => {
  // 2026-10-11 is a Sunday; 17:00 UTC = 20:00 in Turkey.
  const SUNDAY = Date.UTC(2026, 9, 11, 17)
  const week = '5 gün · 312 cevap (%86 doğru)'
  it('is sent on the learner\'s Sunday when it was reported lately, and not on a holiday', () => {
    expect(weeklyText(record({ week, reportedDay: '2026-10-11' }), SUNDAY)).toBe(week)
    expect(weeklyText(record({ week, reportedDay: '2026-10-10' }), SUNDAY)).toBe(week)
    expect(weeklyText(record({ week, reportedDay: '2026-10-04' }), SUNDAY)).toBeUndefined()
    expect(weeklyText(record({ week, reportedDay: '2026-10-11' }), NOW)).toBeUndefined()
    expect(weeklyText(record({ week, reportedDay: '2026-10-11', vacation: { from: '2026-10-10', to: '2026-10-12' } }), SUNDAY)).toBeUndefined()
    expect(weeklyText(record({ reportedDay: '2026-10-11' }), SUNDAY)).toBeUndefined()
  })
})

describe('reminder hour', () => {
  it('turns the cron\'s UTC hour into the learner\'s local hour', () => {
    expect(localHour(-180, 17)).toBe(20)
    expect(localHour(-180, 22)).toBe(1)
    expect(localHour(300, 2)).toBe(21)
    expect(localHour(-330, 14)).toBe(19)
  })

  it('reminds at the chosen hour, and at 20:00 for records saved before hours existed', () => {
    expect(dueNow(record(), 17)).toBe(true)
    expect(dueNow(record(), 18)).toBe(false)
    expect(dueNow(record({ hour: 9 }), 6)).toBe(true)
    expect(dueNow(record({ hour: 9 }), 17)).toBe(false)
  })
})

describe('/api/cron-reminder', () => {
  const cron = (auth?: string, h?: number) =>
    CRON(new Request(`https://app.test/api/cron-reminder${h === undefined ? '' : `?h=${h}`}`, { headers: auth ? { authorization: auth } : {} }))
  const save = async (r: PushRecord) => blobs.set(await recordPath(r.subscription.endpoint), JSON.stringify(r))

  it('refuses callers without the secret, and everyone when no secret is set', async () => {
    expect((await cron('Bearer anything')).status).toBe(401)
    vi.stubEnv('CRON_SECRET', 's3cret')
    expect((await cron()).status).toBe(401)
    expect((await cron('Bearer wrong')).status).toBe(401)
    expect(sent).toEqual([])
  })

  it('reminds only those who have not studied on any of their devices, and drops expired ones', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    const group = 'e'.repeat(64)
    await save(record({ subscription: sub('https://push.example/idle') }))
    await save(record({ subscription: sub('https://push.example/studied'), studiedDay: '2026-10-07' }))
    await save(record({ subscription: sub('https://push.example/phone'), group }))
    await save(record({ subscription: sub('https://push.example/laptop'), group, studiedDay: '2026-10-07' }))
    await save(record({ subscription: sub('https://push.example/resting'), restWeekdays: [3] }))
    await save(record({ subscription: sub('https://push.example/gone') }))
    blobs.set('push/broken.json', '{not json')
    gone.add('https://push.example/gone')

    const res = await cron('Bearer s3cret')
    expect(await res.json()).toEqual({ devices: 6, sent: 1, removed: 1 })
    expect(sent.map((s) => s.endpoint)).toEqual(['https://push.example/idle'])
    expect(JSON.parse(sent[0].body)).toMatchObject({ title: 'Kelime Koçu', url: '/?go=quick' })
  })

  it('each hourly run reaches only the devices whose reminder hour it is', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.UTC(2026, 9, 7, 6, 40))
    await save(record({ subscription: sub('https://push.example/morning'), hour: 9 }))
    await save(record({ subscription: sub('https://push.example/evening') }))
    // Scheduled for 06:00 UTC, run late: the hour named in the path counts.
    vi.setSystemTime(Date.UTC(2026, 9, 7, 7, 2))
    expect(await (await cron('Bearer s3cret', 6)).json()).toMatchObject({ sent: 1 })
    expect(sent.map((s) => s.endpoint)).toEqual(['https://push.example/morning'])
    await cron('Bearer s3cret', 17)
    expect(sent.map((s) => s.endpoint)).toEqual(['https://push.example/morning', 'https://push.example/evening'])
  })

  it('on Sunday sends the week instead, also to someone who studied', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.UTC(2026, 9, 11, 17))
    await save(record({ subscription: sub('https://push.example/week'), studiedDay: '2026-10-11', week: '5 gün · 40 cevap', reportedDay: '2026-10-11' }))
    await cron('Bearer s3cret')
    expect(sent.map((s) => JSON.parse(s.body))).toEqual([{ title: 'Haftan', body: '5 gün · 40 cevap', url: '/?go=progress' }])
    expect(blobs.has(await recordPath('https://push.example/gone'))).toBe(false)
  })
})
