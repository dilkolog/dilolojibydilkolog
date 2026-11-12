import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The R2 files the counters fall back to before migration 0009 has run.
const blobs = new Map<string, string>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: string) => void blobs.set(path, body),
  get: async (path: string) => (blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)).body, blob: { etag: 'e' } } : null),
  list: async () => ({ blobs: [] }),
  del: async () => undefined,
}))

const { quotaLeft, quotaTake, quotaUsed, spendQuota, pruneCounters, resetQuota, resetCounterTable, quotaReserve, quotaGiveBack, QuotaUnavailable } = await import('../../api/_quota')

const SB = 'https://proj.supabase.co'
const ID = 'a'.repeat(64)
const NOON = Date.parse('2026-11-04T12:00:00Z')

/** usage_counters and its functions, as migration 0009 defines them. */
const counters = new Map<string, number>()
let mode: 'ready' | 'missing' | 'down' = 'ready'
let calls: string[] = []

function fakeSupabase(input: string, init: RequestInit = {}): Response {
  const url = new URL(input)
  const fn = url.pathname.replace('/rest/v1/rpc/', '')
  calls.push(fn)
  if (mode === 'missing') return Response.json({ code: 'PGRST202', message: 'Could not find the function' }, { status: 404 })
  if (mode === 'down') return new Response('unavailable', { status: 503 })
  const a = JSON.parse(String(init.body)) as { p_name: string; p_subject: string; p_amount: number; p_max: number; p_day: string; p_keep_days: number }
  const key = `${a.p_name}|${a.p_day}|${a.p_subject}`
  if (fn === 'counter_used') return Response.json(counters.get(key) ?? 0)
  if (fn === 'counter_add') {
    counters.set(key, (counters.get(key) ?? 0) + Math.max(a.p_amount, 0))
    return Response.json(counters.get(key))
  }
  if (fn === 'counter_take') {
    const total = (counters.get(key) ?? 0) + a.p_amount
    if (a.p_amount > a.p_max || total > a.p_max) return Response.json(false)
    counters.set(key, total)
    return Response.json(true)
  }
  if (fn === 'counter_give') {
    counters.set(key, Math.max(0, (counters.get(key) ?? 0) - Math.max(a.p_amount, 0)))
    return Response.json(counters.get(key))
  }
  if (fn === 'counter_prune') return Response.json(3)
  return new Response('not found', { status: 404 })
}

beforeEach(() => {
  counters.clear()
  blobs.clear()
  calls = []
  mode = 'ready'
  resetQuota()
  resetCounterTable()
  vi.stubEnv('SUPABASE_URL', SB)
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => fakeSupabase(String(input), init))
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('daily counters in Supabase (migration 0009)', () => {
  it('counts exactly in the table, per day and account, with no copy kept by this instance', async () => {
    await spendQuota('translate', ID, 600, undefined, NOON)
    expect(counters.get(`translate|2026-11-04|${ID}`)).toBe(600)
    expect(await quotaLeft('translate', ID, 400, 1000, undefined, NOON)).toBe(true)
    expect(await quotaLeft('translate', ID, 401, 1000, undefined, NOON)).toBe(false)
    // Another instance counted meanwhile: seen at once, not a minute later as with the files.
    counters.set(`translate|2026-11-04|${ID}`, 1000)
    expect(await quotaLeft('translate', ID, 1, 1000, undefined, NOON + 1000)).toBe(false)
    expect(await quotaUsed('translate', ID, undefined, NOON + 24 * 3600_000)).toBe(0)
    expect(blobs.size).toBe(0)
  })

  it('takes in one step: requests at once never go past the line together', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => quotaTake('news', ID, 1, 3, undefined, NOON)))
    expect(results.filter(Boolean)).toHaveLength(3)
    expect(counters.get(`news|2026-11-04|${ID}`)).toBe(3)
    expect(calls.every((c) => c === 'counter_take')).toBe(true)
  })

  it('before 0009 has run it keeps counting in the R2 files, and asks the table again only later', async () => {
    mode = 'missing'
    await spendQuota('translate', ID, 600, undefined, NOON)
    expect(blobs.get(`quota/translate/2026-11-04/${ID}.json`)).toBe('{"used":600}')
    expect(await quotaLeft('translate', ID, 401, 1000, undefined, NOON + 1000)).toBe(false)
    expect(calls).toEqual(['counter_add'])
    // Five minutes on, the table is asked again (the owner may have run the migration).
    mode = 'ready'
    await spendQuota('translate', ID, 10, undefined, NOON + 6 * 60_000)
    expect(counters.get(`translate|2026-11-04|${ID}`)).toBe(10)
  })

  it('a failing Supabase never stops the call it guards', async () => {
    mode = 'down'
    expect(await quotaLeft('ai', ID, 1, 150, undefined, NOON)).toBe(true)
    expect(await quotaTake('news', ID, 1, 150, undefined, NOON)).toBe(true)
    expect(await quotaUsed('ai-cost', ID, undefined, NOON)).toBe(0)
    await expect(spendQuota('ai-cost', ID, 5, undefined, NOON)).resolves.toBeUndefined()
    // A failure is not a missing table: nothing goes to the files.
    expect(blobs.size).toBe(0)
  })

  it('the AI’s reservation is closed when the store fails, and what it set aside can be given back', async () => {
    expect(await quotaReserve('ai-cost', ID, 300, 1000, undefined, NOON)).toBe(true)
    expect(await quotaReserve('ai-cost', ID, 800, 1000, undefined, NOON)).toBe(false)
    await quotaGiveBack('ai-cost', ID, 250, undefined, NOON)
    expect(counters.get(`ai-cost|2026-11-04|${ID}`)).toBe(50)
    await quotaGiveBack('ai-cost', ID, 9999, undefined, NOON)
    expect(counters.get(`ai-cost|2026-11-04|${ID}`)).toBe(0)
    mode = 'down'
    await expect(quotaReserve('ai', ID, 1, 150, undefined, NOON)).rejects.toBeInstanceOf(QuotaUnavailable)
  })

  it('a project without counter_give (0013) keeps counting in the table: giving back just does nothing', async () => {
    await spendQuota('tts', ID, 100, undefined, NOON)
    const real = fakeSupabase
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) =>
      String(input).endsWith('counter_give') ? Response.json({ code: 'PGRST202' }, { status: 404 }) : real(String(input), init),
    )
    await quotaGiveBack('tts', ID, 40, undefined, NOON)
    await spendQuota('tts', ID, 1, undefined, NOON)
    expect(counters.get(`tts|2026-11-04|${ID}`)).toBe(101)
    expect(blobs.size).toBe(0)
  })

  it('in the files, a reservation and a give-back move the same count', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    expect(await quotaReserve('ai-cost', ID, 600, 1000, undefined, NOON)).toBe(true)
    expect(await quotaReserve('ai-cost', ID, 600, 1000, undefined, NOON)).toBe(false)
    await quotaGiveBack('ai-cost', ID, 200, undefined, NOON)
    expect(blobs.get(`quota/ai-cost/2026-11-04/${ID}.json`)).toBe('{"used":400}')
  })

  it('prunes old days through the table; nothing without Supabase', async () => {
    expect(await pruneCounters(120, NOON)).toBe(3)
    vi.stubEnv('SUPABASE_URL', '')
    expect(await pruneCounters(120, NOON)).toBe(0)
  })
})
