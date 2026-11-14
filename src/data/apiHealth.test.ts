import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const blobs = new Map<string, string>()
let storageDown = false
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: string) => void blobs.set(path, body),
  get: async (path: string) => {
    if (storageDown) throw new Error('r2 down')
    return blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)).body, blob: { etag: 'e' } } : null
  },
  list: async () => ({ blobs: [] }),
  del: async () => undefined,
}))

const { healthAlert, problems } = await import('../../api/_health')
const { GET } = await import('../../api/health')
const { resetRate } = await import('../../api/_rate')
const { resetDocs } = await import('../../api/_docs')

const SB = 'https://proj.supabase.co'
let supabaseDown = false
let usage: unknown = null
const mails: { to: string; subject: string; text: string }[] = []

async function fakeFetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  const url = String(input)
  if (url.startsWith('https://api.resend.com')) {
    mails.push(...([JSON.parse(String(init.body))].flat() as { to: string[] | string; subject: string; text: string }[]).map((m) => ({ to: [m.to].flat()[0], subject: m.subject, text: m.text })))
    return Response.json({ data: [{ id: 'm1' }] })
  }
  if (supabaseDown) throw new Error('supabase down')
  // The documents table is not there in this test (state goes to the R2 files); flags read as none.
  if (url.includes('/rest/v1/server_docs')) return Response.json({ code: 'PGRST205' }, { status: 404 })
  if (url.endsWith('/rest/v1/rpc/storage_usage')) return usage ? Response.json(usage) : Response.json({ code: 'PGRST202' }, { status: 404 })
  return Response.json([])
}

const ALL = { SUPABASE_URL: SB, SUPABASE_SECRET_KEY: 'sb_secret_test', CRON_SECRET: 'c', RESEND_API_KEY: 're_test', RESEND_FROM: 'Diloloji <a@diloloji.com>', OWNER_EMAIL: 'sahip@example.com', ANTHROPIC_API_KEY: 'k', DEEPL_AUTH_KEY: 'k' }

beforeEach(() => {
  blobs.clear()
  mails.length = 0
  supabaseDown = false
  usage = null
  storageDown = false
  resetRate()
  resetDocs()
  for (const [k, v] of Object.entries(ALL)) vi.stubEnv(k, v)
  vi.stubGlobal('fetch', fakeFetch)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('the hourly health check', () => {
  it('stays quiet when all is well, mails once when something breaks, not again while it lasts, and once when it is fixed', async () => {
    expect(await healthAlert()).toBe('same')
    expect(mails).toHaveLength(0)

    supabaseDown = true
    expect(await healthAlert()).toBe('sent')
    expect(mails).toHaveLength(1)
    expect(mails[0].to).toBe('sahip@example.com')
    expect(mails[0].subject).toContain('yeni sorun')
    expect(mails[0].text).toContain('Supabase')

    expect(await healthAlert()).toBe('same')
    expect(mails).toHaveLength(1)

    supabaseDown = false
    expect(await healthAlert()).toBe('sent')
    expect(mails[1].subject).toContain('giderildi')
  })

  it('names a missing secret by name only, never a value', async () => {
    vi.stubEnv('DEEPL_AUTH_KEY', '')
    const found = await problems()
    expect(found).toEqual(['DEEPL_AUTH_KEY tanımlı değil (çeviri).'])
    expect(await healthAlert()).toBe('sent')
    expect(mails[0].text).not.toContain('sb_secret_test')
  })

  it('without a mail service it keeps the state and says it could not tell anyone', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    expect(await healthAlert()).toBe('off')
    expect(mails).toHaveLength(0)
  })
})

describe('GET /api/health', () => {
  const ask = () => GET(new Request('https://app.test/api/health'))

  it('answers 200 with each part ok, and nothing about settings', async () => {
    const res = await ask()
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toMatchObject({ ok: true, supabase: 'ok', storage: 'ok' })
    expect(JSON.stringify(body)).not.toMatch(/KEY|SECRET|OWNER/)
  })

  it('answers 503 when Supabase or R2 cannot be reached', async () => {
    supabaseDown = true
    const res = await ask()
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ ok: false, supabase: 'down', storage: 'ok' })
    supabaseDown = false
    storageDown = true
    expect((await ask()).status).toBe(503)
  })
})

describe('how full Supabase is', () => {
  it('names the database or the media bucket past 80% and 90% of the plan, and nothing below or without 0014', async () => {
    expect(await problems()).toEqual([])
    usage = [{ db_bytes: 300_000_000, media_bytes: 100_000_000, media_files: 10 }]
    expect(await problems()).toEqual([])
    usage = [{ db_bytes: 410_000_000, media_bytes: 950_000_000, media_files: 10 }]
    const lines = await problems()
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('veritabanı %80')
    expect(lines[1]).toContain('dosya deposu %90')
    // The owner's plan may be larger.
    vi.stubEnv('SUPABASE_DB_LIMIT_MB', '8000')
    expect((await problems()).some((l) => l.includes('veritabanı'))).toBe(false)
  })

  it('mails once per step, not as the number moves', async () => {
    usage = [{ db_bytes: 410_000_000, media_bytes: 0, media_files: 0 }]
    expect(await healthAlert()).toBe('sent')
    usage = [{ db_bytes: 420_000_000, media_bytes: 0, media_files: 0 }]
    expect(await healthAlert()).toBe('same')
    expect(mails).toHaveLength(1)
  })
})
