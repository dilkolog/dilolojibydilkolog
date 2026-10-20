import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const blobs = new Map<string, string>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: string) => {
    blobs.set(path, body)
    return {}
  },
  get: async (path: string) => (blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)).body } : null),
  del: async (path: string) => void blobs.delete(path),
  list: async () => ({ blobs: [], hasMore: false }),
}))

type Digest = typeof import('../../api/_errorDigest')
let d: Digest
let mails: { to: string[]; subject: string; html: string; text: string }[] = []

// Monday 2026-10-19 08:00 UTC; the week before began Monday 2026-10-12.
const MONDAY = Date.UTC(2026, 9, 19, 8)
const LAST_WEEK = Date.UTC(2026, 9, 14, 12)

beforeEach(async () => {
  vi.resetModules()
  blobs.clear()
  mails = []
  d = await import('../../api/_errorDigest')
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('ERROR_DIGEST_TO', 'owner@example.com')
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    mails.push(...JSON.parse(init.body as string))
    return new Response('{}')
  })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const saved = (week: string) => JSON.parse(blobs.get(`errors/${week}.json`)!) as import('../../api/_errorDigest').ErrorWeek

describe('weeks and signatures', () => {
  it('starts a week on Monday (UTC)', () => {
    expect(d.weekStart(Date.UTC(2026, 9, 19, 0))).toBe('2026-10-19')
    expect(d.weekStart(Date.UTC(2026, 9, 25, 23))).toBe('2026-10-19')
    expect(d.weekStart(Date.UTC(2026, 9, 18, 23))).toBe('2026-10-12')
  })

  it('counts the same error once however its numbers and ids differ', () => {
    expect(d.signature('client', 'TypeError', 'Cannot read x of 12 at 3f9a8b7c1d2e', 'app')).toBe(d.signature('client', 'TypeError', 'Cannot read x of 99 at aaaaaaaa11', 'app'))
    expect(d.signature('client', 'TypeError', 'boom', 'app')).not.toBe(d.signature('worker', 'TypeError', 'boom', 'app'))
  })
})

describe('counting', () => {
  it('writes an error at once and keeps the rest of a burst in memory until the next write', async () => {
    await d.noteError('client', { name: 'TypeError', message: 'boom 1', where: 'app' }, LAST_WEEK)
    expect(Object.values(saved('2026-10-12').items)).toHaveLength(1)
    // Within the flush window: not written yet.
    await d.noteError('client', { name: 'TypeError', message: 'boom 2', where: 'app' }, LAST_WEEK + 1000)
    await d.noteError('client', { name: 'RangeError', message: 'other', where: 'app' }, LAST_WEEK + 2000)
    expect(Object.values(saved('2026-10-12').items).reduce((n, e) => n + e.n, 0)).toBe(1)
    // After it, one write takes everything counted.
    await d.noteError('client', { name: 'TypeError', message: 'boom 3', where: 'app' }, LAST_WEEK + d.FLUSH_MS + 5000)
    const items = Object.values(saved('2026-10-12').items)
    expect(items.find((e) => e.name === 'TypeError')!.n).toBe(3)
    expect(items.find((e) => e.name === 'RangeError')!.n).toBe(1)
  })

  it('never throws, even when the storage does', async () => {
    blobs.set('errors/2026-10-12.json', '{not json')
    await expect(d.noteError('worker', { name: 'Error', message: 'x', where: '/api/sync' }, LAST_WEEK)).resolves.toBeUndefined()
    await expect(d.noteError('worker', {}, LAST_WEEK)).resolves.toBeUndefined()
  })

  it('keeps few different errors', async () => {
    for (let i = 0; i < d.MAX_ITEMS + 20; i++) await d.noteError('client', { name: 'E', message: `message ${'x'.repeat(i % 50)} ${String.fromCharCode(97 + (i % 26))}${i}z`.replace(/\d/g, ''), where: `w${i}` }, LAST_WEEK + i * d.FLUSH_MS)
    expect(Object.keys(saved('2026-10-12').items).length).toBeLessThanOrEqual(d.MAX_ITEMS)
  })
})

describe('the Monday digest', () => {
  const seed = () =>
    blobs.set(
      'errors/2026-10-12.json',
      JSON.stringify({
        week: '2026-10-12',
        items: Object.fromEntries(
          [9, 7, 5, 3, 2, 1].map((n, i) => [`s${i}`, { n, kind: i % 2 ? 'worker' : 'client', name: `Err${i}`, message: i === 0 ? '<script>alert(1)</script> boom' : `message ${i}`, where: '/api/x', first: '2026-10-13T10:00:00Z', last: '2026-10-17T10:00:00Z' }]),
        ),
      }),
    )

  it('mails the five most frequent errors of last week, escaped, once', async () => {
    seed()
    expect(await d.sendErrorDigest(MONDAY)).toBe('sent')
    expect(mails).toHaveLength(1)
    expect(mails[0].to).toEqual(['owner@example.com'])
    expect(mails[0].subject).toBe('Diloloji: haftanın en sık 5 hatası')
    expect(mails[0].text).toContain('9× Err0')
    expect(mails[0].text).not.toContain('Err5')
    expect(mails[0].html).not.toContain('<script>')
    expect(mails[0].html).toContain('&lt;script&gt;')
    expect(saved('2026-10-12').sentAt).toBeTruthy()
    // The next hours of that Monday find it sent.
    expect(await d.sendErrorDigest(MONDAY + 3_600_000)).toBe('already')
    expect(mails).toHaveLength(1)
  })

  it('stays quiet without an address, without errors, or when the mail fails', async () => {
    expect(await d.sendErrorDigest(MONDAY)).toBe('none')
    seed()
    vi.stubEnv('ERROR_DIGEST_TO', '')
    expect(await d.sendErrorDigest(MONDAY)).toBe('off')
    vi.stubEnv('ERROR_DIGEST_TO', 'owner@example.com')
    vi.stubGlobal('fetch', async () => new Response('no', { status: 422 }))
    expect(await d.sendErrorDigest(MONDAY)).toBe('failed')
    expect(saved('2026-10-12').sentAt).toBeUndefined()
  })
})
