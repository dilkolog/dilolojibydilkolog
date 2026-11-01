import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/_account.js', () => ({ requireApproved: vi.fn(async () => null), accountOf: vi.fn(async () => 'acct') }))
vi.mock('../../api/_quota.js', () => ({ quotaLeft: vi.fn(async () => true), spendQuota: vi.fn(async () => {}), dailyQuotaReached: () => Response.json({ error: 'daily_quota' }, { status: 429 }) }))

import { POST, GET, refuse, MAX_TOKENS } from '../../api/ai'
import { requireApproved } from '../../api/_account.js'
import { quotaLeft } from '../../api/_quota.js'
import { resetRate } from '../../api/_rate.js'

const good = { model: 'claude-sonnet-5-5', max_tokens: 1000, messages: [{ role: 'user', content: 'hi' }] }
const ask = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://diloloji.com/api/ai', { method: 'POST', headers: { origin: 'https://diloloji.com', 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) })

beforeEach(() => {
  resetRate()
  vi.restoreAllMocks()
  vi.mocked(requireApproved).mockResolvedValue(null)
  vi.mocked(quotaLeft).mockResolvedValue(true)
  process.env.ANTHROPIC_API_KEY = 'sk-test-key'
})

describe('refuse', () => {
  it('lets the app’s own requests through', () => expect(refuse(good)).toBeNull())
  it('refuses other models, streaming, tools, empty messages and big max_tokens', () => {
    expect(refuse({ ...good, model: 'claude-other' })).toBe('bad model')
    expect(refuse({ ...good, stream: true })).toBe('no streaming')
    expect(refuse({ ...good, tools: [] })).toBe('no tools')
    expect(refuse({ ...good, messages: [] })).toBe('bad messages')
    expect(refuse({ ...good, max_tokens: MAX_TOKENS + 1 })).toBe('bad max_tokens')
    expect(refuse('x')).toBe('bad body')
  })
})

describe('/api/ai', () => {
  it('is off without the owner’s key, and says nothing of it to people who are not approved', async () => {
    delete process.env.ANTHROPIC_API_KEY
    expect((await POST(ask(good))).status).toBe(503)
    vi.mocked(requireApproved).mockResolvedValue(Response.json({ error: 'approval_required' }, { status: 403 }))
    process.env.ANTHROPIC_API_KEY = 'sk-test-key'
    expect((await POST(ask(good))).status).toBe(403)
    expect((await GET(new Request('https://diloloji.com/api/ai', { headers: { origin: 'https://diloloji.com' } }))).status).toBe(403)
  })

  it('forwards an approved account’s request with the owner’s key and the beta header, never the page’s own headers', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const res = await POST(ask(good, { 'anthropic-beta': 'server-side-fallback-2026-07-01', 'x-api-key': 'attacker' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: 1 })
    const [url, init] = upstream.mock.calls[0]
    expect(String(url)).toBe('https://api.anthropic.com/v1/messages?beta=true')
    const h = (init as RequestInit).headers as Record<string, string>
    expect(h['x-api-key']).toBe('sk-test-key')
    expect(h['anthropic-beta']).toBe('server-side-fallback-2026-07-01')
  })

  it('refuses a stranger’s page, a bad body, a bad beta header, and the day’s allowance used up', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    expect((await POST(new Request('https://diloloji.com/api/ai', { method: 'POST', headers: { origin: 'https://evil.example' }, body: JSON.stringify(good) }))).status).toBe(403)
    expect((await POST(ask('not json'))).status).toBe(400)
    expect((await POST(ask({ ...good, model: 'claude-fake' }))).status).toBe(400)
    await POST(ask(good, { 'anthropic-beta': 'x; injected=1' }))
    expect(((upstream.mock.calls[0][1] as RequestInit).headers as Record<string, string>)['anthropic-beta']).toBeUndefined()
    vi.mocked(quotaLeft).mockResolvedValue(false)
    expect((await POST(ask(good))).status).toBe(429)
  })

  it('hides the key’s own failures behind a plain 502', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":"invalid x-api-key"}', { status: 401 }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(ask(good))
    expect(res.status).toBe(502)
    expect(await res.text()).not.toContain('x-api-key')
  })
})
