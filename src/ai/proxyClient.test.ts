import { describe, expect, it, vi } from 'vitest'

const accessFetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'x', content: [], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }), { headers: { 'content-type': 'application/json' } }))
vi.mock('../data/access', () => ({ accessFetch: (url: string, init?: RequestInit) => accessFetch(url, init) }))

describe('the AI client', () => {
  it('sends every request to the site proxy with the account identity, and holds no real key', async () => {
    const { client } = await import('./claude')
    const c = client('sentence')
    expect(c.apiKey).toBe('account')
    await c.beta.messages.create({ model: 'claude-sonnet-5-5', max_tokens: 5, messages: [{ role: 'user', content: 'hi' }] })
    expect(accessFetch).toHaveBeenCalledTimes(1)
    expect(accessFetch.mock.calls[0][0]).toBe('/api/ai')
    // The server is told which feature this is for: the owner's level decides what an account may do.
    expect(new Headers(accessFetch.mock.calls[0][1]?.headers).get('x-ai-feature')).toBe('sentence')
  })
})

describe('what the app sends passes the proxy’s allow-list', () => {
  it('a structured call with a picture, the effort setting, the fallback and the SDK’s beta header', async () => {
    const { refuse, betaHeader } = await import('../../api/ai')
    const { wordsFromPhoto } = await import('./claude')
    accessFetch.mockClear()
    accessFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: '{"words":[]}' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }), { headers: { 'content-type': 'application/json' } }),
    )
    await wordsFromPhoto('account', { language: 'fr', count: 5, have: [], mediaType: 'image/jpeg', imageBase64: 'AAAA' } as Parameters<typeof wordsFromPhoto>[1])
    const init = accessFetch.mock.calls[0][1]!
    expect(refuse(JSON.parse(String(init.body)))).toBeNull()
    const beta = new Headers(init.headers).get('anthropic-beta')
    expect(betaHeader(beta)?.split(',').sort()).toEqual(beta?.split(',').map((b) => b.trim()).sort())
  })
})
