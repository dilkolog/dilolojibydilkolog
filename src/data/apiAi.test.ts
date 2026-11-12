import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/_account.js', () => ({ requireApproved: vi.fn(async () => null), accountOf: vi.fn(async () => 'acct') }))
vi.mock('../../api/_supabase.js', () => ({ aiLevelOf: vi.fn(async () => null), supabaseOn: () => false, rest: vi.fn() }))
vi.mock('../../api/_quota.js', () => ({ canGiveBack: vi.fn(() => true), quotaReserve: vi.fn(async () => true), quotaGiveBack: vi.fn(async () => {}), spendQuota: vi.fn(async () => {}), dailyQuotaReached: () => Response.json({ error: 'daily_quota' }, { status: 429 }) }))

import { POST, GET, refuse, costUnits, callUnits, betaHeader, MAX_TOKENS } from '../../api/ai'
import { requireApproved } from '../../api/_account.js'
import { canGiveBack, quotaGiveBack, quotaReserve, spendQuota } from '../../api/_quota.js'
import { aiLevelOf } from '../../api/_supabase.js'
import { resetRate } from '../../api/_rate.js'

const good = { model: 'claude-sonnet-5-5', max_tokens: 1000, messages: [{ role: 'user', content: 'hi' }] }
const ask = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://diloloji.com/api/ai', { method: 'POST', headers: { origin: 'https://diloloji.com', 'content-type': 'application/json', 'x-ai-feature': 'sentence', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) })

beforeEach(() => {
  resetRate()
  vi.restoreAllMocks()
  vi.mocked(requireApproved).mockResolvedValue(null)
  vi.mocked(quotaReserve).mockReset().mockResolvedValue(true)
  vi.mocked(quotaGiveBack).mockClear()
  vi.mocked(spendQuota).mockClear()
  vi.mocked(canGiveBack).mockReturnValue(true)
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

  it('lets through only the fields the app sends: nothing else that could change the price', () => {
    const app = { ...good, system: 'be brief', fallbacks: 'default', output_config: { effort: 'low', format: { type: 'json_schema', schema: {} } } }
    expect(refuse(app)).toBeNull()
    for (const extra of [{ speed: 'fast' }, { service_tier: 'priority' }, { inference_geo: 'us' }, { context_management: {} }, { metadata: {} }]) expect(refuse({ ...good, ...extra })).toMatch(/^field not allowed/)
    expect(refuse({ ...good, fallbacks: [{ model: 'claude-opus-5-5' }] })).toBe('bad fallbacks')
    expect(refuse({ ...good, output_config: { effort: 'max' } })).toBe('bad effort')
    expect(refuse({ ...good, output_config: { task_budget: 1 } })).toBe('bad output_config')
    expect(refuse({ ...good, thinking: { type: 'enabled', budget_tokens: 9000 } })).toBe('bad thinking')
    expect(refuse({ ...good, temperature: 3 })).toBe('bad temperature')
  })

  it('takes text and inline pictures only: no documents or links the API would fetch', () => {
    const photo = { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } }, { type: 'text', text: 'words?' }] }
    expect(refuse({ ...good, messages: [photo, { role: 'assistant', content: 'ok' }] })).toBeNull()
    expect(refuse({ ...good, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'url', url: 'https://x.example/a.png' } }] }] })).toBe('bad messages')
    expect(refuse({ ...good, messages: [{ role: 'user', content: [{ type: 'document', source: { type: 'url', url: 'https://x.example/a.pdf' } }] }] })).toBe('bad messages')
    expect(refuse({ ...good, messages: [{ role: 'user', content: [{ type: 'text', text: 'hi', cache_control: { type: 'ephemeral', ttl: '1h' } }] }] })).toBe('bad messages')
    expect(refuse({ ...good, messages: [{ role: 'system', content: 'hi' }] })).toBe('bad messages')
  })
})

describe('the beta header', () => {
  it('keeps only the app’s own beta features', () => {
    expect(betaHeader('server-side-fallback-2026-07-01,structured-outputs-2025-12-15')).toBe('server-side-fallback-2026-07-01,structured-outputs-2025-12-15')
    expect(betaHeader('structured-outputs-2025-12-15, fast-mode-2026-01-01')).toBe('structured-outputs-2025-12-15')
    expect(betaHeader('context-1m-2025-08-07')).toBeNull()
    expect(betaHeader(null)).toBeNull()
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
    vi.mocked(quotaReserve).mockResolvedValue(false)
    expect((await POST(ask(good))).status).toBe(429)
  })

  it('refuses when the counters cannot be read: the owner’s money is never spent uncounted', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    vi.mocked(quotaReserve).mockRejectedValue(new Error('store down'))
    expect((await POST(ask(good))).status).toBe(503)
    expect(upstream).not.toHaveBeenCalled()
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
    // A model the app does not know (a fallback Anthropic picked) is priced as the dearest, never as free.
    expect(costUnits('claude-other', { input_tokens: 1_000_000 })).toBe(40_000)
    expect(costUnits('claude-opus-5-5', null)).toBe(0)
  })

  it('sets the call and its worst case aside first (the account, then the site), then corrects it to what the answer cost', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ model: 'claude-sonnet-5-5', usage: { input_tokens: 10, output_tokens: 20 } }), { status: 200 }))
    expect((await POST(ask(good))).status).toBe(200)
    const { expected, worst } = callUnits(good)
    expect(quotaReserve).toHaveBeenCalledWith('ai', 'acct', 1, 150)
    // Let in while the expected cost fits the day; held at the worst case.
    expect(quotaReserve).toHaveBeenCalledWith('ai-cost', 'acct', worst, 0.75 * 10_000 * 0.5 + worst - expected)
    expect(quotaReserve).toHaveBeenCalledWith('ai-site', 'site', worst, 5 * 10_000 + worst - expected)
    const cost = costUnits('claude-sonnet-5-5', { input_tokens: 10, output_tokens: 20 })
    expect(quotaGiveBack).toHaveBeenCalledWith('ai-cost', 'acct', worst - cost)
    expect(quotaGiveBack).toHaveBeenCalledWith('ai-site', 'site', worst - cost)
    vi.mocked(quotaReserve).mockImplementation(async (name) => name !== 'ai-cost')
    expect((await POST(ask(good))).status).toBe(429)
    // The call set aside for it goes back when the money does not fit.
    expect(quotaGiveBack).toHaveBeenCalledWith('ai', 'acct', 1)
  })

  it('holds only the expected cost while nothing set aside can be given back (0013 not run)', async () => {
    vi.mocked(canGiveBack).mockReturnValue(false)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ model: 'claude-opus-5-5', usage: { input_tokens: 10, output_tokens: 20 } }), { status: 200 }))
    const big = { ...good, model: 'claude-opus-5-5', max_tokens: 16_000 }
    await POST(ask(big))
    expect(quotaReserve).toHaveBeenCalledWith('ai-cost', 'acct', callUnits(big).expected, 0.75 * 10_000 * 0.5)
  })

  it('prices the answer by the model that wrote it: a fallback to a dearer model costs what it cost', async () => {
    const usage = { input_tokens: 100_000, output_tokens: 10_000 }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ model: 'claude-opus-5-5', usage }), { status: 200 }))
    await POST(ask({ ...good, model: 'claude-haiku-4-5', max_tokens: 10_000 }))
    const { worst } = callUnits({ ...good, model: 'claude-haiku-4-5', max_tokens: 10_000 })
    expect(spendQuota).toHaveBeenCalledWith('ai-cost', 'acct', costUnits('claude-opus-5-5', usage) - worst)
  })

  it('gives everything back when the call fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":"overloaded"}', { status: 529 }))
    expect((await POST(ask(good))).status).toBe(529)
    expect(quotaGiveBack).toHaveBeenCalledWith('ai', 'acct', 1)
    expect(quotaGiveBack).toHaveBeenCalledWith('ai-cost', 'acct', callUnits(good).worst)
    expect(quotaGiveBack).toHaveBeenCalledWith('ai-site', 'site', callUnits(good).worst)
  })

  describe('with real counters', () => {
    // counter_take's rule (used + amount <= max) over an in-memory day, so the arithmetic of the holds is what is tested.
    let used: Map<string, number>
    beforeEach(() => {
      used = new Map()
      const key = (name: string, id: string) => `${name}|${id}`
      vi.mocked(quotaReserve).mockImplementation(async (name, id, amount, max) => {
        const now = used.get(key(name, id)) ?? 0
        if (now + amount > max) return false
        used.set(key(name, id), now + amount)
        return true
      })
      vi.mocked(quotaGiveBack).mockImplementation(async (name, id, amount) => void used.set(key(name, id), Math.max(0, (used.get(key(name, id)) ?? 0) - amount)))
      vi.mocked(spendQuota).mockImplementation(async (name, id, amount) => void used.set(key(name, id), (used.get(key(name, id)) ?? 0) + amount))
    })
    const big = { ...good, model: 'claude-opus-5-5', max_tokens: 16_000 }
    // Every call writes all of its max_tokens: the worst an account could make it do.
    const answer = () => new Response(JSON.stringify({ model: 'claude-opus-5-5', usage: { input_tokens: 10, output_tokens: 16_000 } }), { status: 200 })

    it('requests sent at once cannot spend the day several times over', async () => {
      let release!: () => void
      const gate = new Promise<void>((r) => (release = r))
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => (await gate, answer()))
      const all = Promise.all(Array.from({ length: 10 }, () => POST(ask(big))))
      await new Promise((r) => setTimeout(r, 20))
      release()
      const statuses = (await all).map((r) => r.status)
      const spent = used.get('ai-cost|acct')!
      const budget = 0.75 * 10_000
      // One call's worth over the day at most (the last one let in), never 3-4 times the day.
      expect(spent).toBeLessThanOrEqual(budget + callUnits(big).worst)
      expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0)
    })

    it('the whole site stops at its own day, whoever asks', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => answer())
      used.set('ai-site|site', 5 * 10_000 - 10)
      expect((await POST(ask(big))).status).toBe(429)
      // Nothing of the account's day stays taken by the refused call.
      expect(used.get('ai|acct')).toBe(0)
      expect(used.get('ai-cost|acct')).toBe(0)
    })
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
    const budgets: number[] = []
    vi.mocked(quotaReserve).mockImplementation(async (name, _id, _amount, max) => (name === 'ai-cost' && budgets.push(max), true))
    vi.mocked(aiLevelOf).mockResolvedValue('kelime')
    await POST(ask(good, { 'x-ai-feature': 'word_fill' }))
    vi.mocked(aiLevelOf).mockResolvedValue('tam')
    await POST(ask(good, { 'x-ai-feature': 'word_fill' }))
    expect(budgets).toEqual([Math.round(0.75 * 10_000 * 0.2), 0.75 * 10_000])
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
