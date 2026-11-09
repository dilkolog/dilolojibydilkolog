import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/_account.js', () => ({ requireApproved: vi.fn(async () => null), accountOf: vi.fn(async () => 'acct') }))
vi.mock('../../api/_supabase.js', () => ({ aiLevelOf: vi.fn(async () => null), supabaseOn: () => false, rest: vi.fn() }))
vi.mock('../../api/_quota.js', () => ({ quotaTake: vi.fn(async () => true), quotaRefund: vi.fn(async () => {}), spendQuota: vi.fn(async () => {}), dailyQuotaReached: () => Response.json({ error: 'daily_quota' }, { status: 429 }) }))

import { POST, GET, refuse, costUnits, reserveUnits, MAX_TOKENS } from '../../api/ai'
import { requireApproved } from '../../api/_account.js'
import { quotaRefund, quotaTake, spendQuota } from '../../api/_quota.js'
import { aiLevelOf } from '../../api/_supabase.js'
import { resetRate } from '../../api/_rate.js'
import { BUDGET_SHARE, DEFAULT_AI_LEVEL } from '../ai/levels'

const good = { model: 'claude-sonnet-5-5', max_tokens: 1000, messages: [{ role: 'user', content: 'hi' }] }
const ask = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://diloloji.com/api/ai', { method: 'POST', headers: { origin: 'https://diloloji.com', 'content-type': 'application/json', 'x-ai-feature': 'sentence', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) })

beforeEach(() => {
  resetRate()
  vi.restoreAllMocks()
  vi.mocked(requireApproved).mockResolvedValue(null)
  vi.mocked(quotaTake).mockReset().mockResolvedValue(true)
  vi.mocked(quotaRefund).mockClear()
  vi.mocked(spendQuota).mockClear()
  vi.mocked(aiLevelOf).mockResolvedValue(null)
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
    vi.mocked(quotaTake).mockResolvedValue(false)
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

describe('what a day may cost', () => {
  it('counts money from the usage the answer reports, by model', () => {
    expect(costUnits('claude-opus-5-5', { input_tokens: 1_000_000, output_tokens: 0 })).toBe(40_000)
    expect(costUnits('claude-haiku-4-5', { input_tokens: 0, output_tokens: 1_000_000 })).toBe(50_000)
    expect(costUnits('claude-sonnet-5-5', { input_tokens: 1000, output_tokens: 1000, cache_read_input_tokens: 1000 })).toBeGreaterThan(0)
    expect(costUnits('claude-other', { input_tokens: 5 })).toBe(0)
    expect(costUnits('claude-opus-5-5', null)).toBe(0)
  })

  it('takes the call and an estimate of its money before asking, and settles the money from the answer', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ usage: { input_tokens: 10_000, output_tokens: 2_000 } }), { status: 200 }))
    expect((await POST(ask(good))).status).toBe(200)
    const model = (good as { model: string }).model
    const reserved = reserveUnits(model, JSON.stringify(good).length, (good as { max_tokens: number }).max_tokens)
    const real = costUnits(model, { input_tokens: 10_000, output_tokens: 2_000 })
    expect(quotaTake).toHaveBeenCalledWith('ai', 'acct', 1, expect.any(Number), undefined, expect.any(Number))
    // The estimate may sit on top of the budget: the line is "nothing more once the day's money is used up".
    const cost = vi.mocked(quotaTake).mock.calls.find((c) => c[0] === 'ai-cost')!
    expect(cost[2]).toBe(reserved)
    expect(cost[3]).toBe(Math.round(0.75 * 10_000 * BUDGET_SHARE[DEFAULT_AI_LEVEL]) + reserved)
    expect(real).toBeGreaterThan(reserved)
    expect(spendQuota).toHaveBeenCalledWith('ai-cost', 'acct', real - reserved, undefined, expect.any(Number))
    // The day's money used up: refused before Anthropic is asked, and the call it took is given back.
    upstream.mockClear()
    vi.mocked(quotaTake).mockImplementation(async (name) => name !== 'ai-cost')
    expect((await POST(ask(good))).status).toBe(429)
    expect(upstream).not.toHaveBeenCalled()
    expect(quotaRefund).toHaveBeenCalledWith('ai', 'acct', 1, undefined, expect.any(Number))
  })

  it('gives the call and its money back when Anthropic did not answer well, and the rest of an estimate that was too high', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":"overloaded"}', { status: 529 }))
    expect((await POST(ask(good))).status).toBe(529)
    expect(quotaRefund).toHaveBeenCalledWith('ai', 'acct', 1, undefined, expect.any(Number))
    expect(quotaRefund).toHaveBeenCalledWith('ai-cost', 'acct', expect.any(Number), undefined, expect.any(Number))
    expect(spendQuota).not.toHaveBeenCalled()
    vi.mocked(quotaRefund).mockClear()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 }))
    expect((await POST(ask(good))).status).toBe(200)
    expect(vi.mocked(quotaRefund).mock.calls.filter((c) => c[0] === 'ai')).toHaveLength(0)
    expect(vi.mocked(quotaRefund).mock.calls.filter((c) => c[0] === 'ai-cost')).toHaveLength(1)
  })
})

describe('what the owner opened for an account (profiles.ai_level)', () => {
  const ok = () => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 }))

  it('an account with no level set gets the default: study features yes, the free chat, photo and podcast no', async () => {
    const upstream = ok()
    expect((await POST(ask(good, { 'x-ai-feature': 'sentence' }))).status).toBe(200)
    for (const f of ['monki', 'chat', 'photo_words', 'podcast']) {
      const res = await POST(ask(good, { 'x-ai-feature': f }))
      expect(res.status).toBe(403)
      expect(await res.json()).toMatchObject({ error: 'ai_level', level: 'calisma', needs: 'tam' })
    }
    expect(upstream).toHaveBeenCalledTimes(1)
  })

  it('the owner can open everything, narrow it to words, or close it', async () => {
    ok()
    vi.mocked(aiLevelOf).mockResolvedValue('tam')
    expect((await POST(ask(good, { 'x-ai-feature': 'monki' }))).status).toBe(200)
    vi.mocked(aiLevelOf).mockResolvedValue('kelime')
    expect((await POST(ask(good, { 'x-ai-feature': 'word_fill' }))).status).toBe(200)
    expect((await POST(ask(good, { 'x-ai-feature': 'sentence' }))).status).toBe(403)
    vi.mocked(aiLevelOf).mockResolvedValue('kapali')
    expect((await POST(ask(good, { 'x-ai-feature': 'word_fill' }))).status).toBe(403)
  })

  it('a request that names no feature, or one the app does not have, is refused', async () => {
    ok()
    expect((await POST(ask(good, { 'x-ai-feature': 'free_chat' }))).status).toBe(400)
    expect((await POST(ask(good, { 'x-ai-feature': '' }))).status).toBe(400)
  })

  it('the day’s money is shared out by level: a smaller level stops sooner', async () => {
    ok()
    vi.mocked(aiLevelOf).mockResolvedValue('kelime')
    // The account has used a fifth of the whole day's money: the take passes only when the level's share is larger.
    const used = Math.round(0.75 * 10_000 * 0.2) + 1
    vi.mocked(quotaTake).mockImplementation(async (name, _id, amount, max) => name !== 'ai-cost' || used + amount <= max)
    expect((await POST(ask(good, { 'x-ai-feature': 'word_fill' }))).status).toBe(429)
    vi.mocked(aiLevelOf).mockResolvedValue('tam')
    expect((await POST(ask(good, { 'x-ai-feature': 'word_fill' }))).status).toBe(200)
  })

  it('GET tells the app its level and what it opens, and closed means not available', async () => {
    const get = () => GET(new Request('https://diloloji.com/api/ai', { headers: { origin: 'https://diloloji.com' } }))
    const open = await (await get()).json()
    expect(open).toMatchObject({ available: true, level: 'calisma' })
    expect(open.features).toContain('sentence')
    expect(open.features).not.toContain('monki')
    vi.mocked(aiLevelOf).mockResolvedValue('kapali')
    expect(await (await get()).json()).toMatchObject({ available: false, level: 'kapali', features: [] })
  })
})
