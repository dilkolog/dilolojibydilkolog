import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../data/supabase', () => ({ supabaseConfigured: () => true, currentSession: async () => ({ access_token: 'tok-ali' }) }))

const { testKey } = await import('./claude')
const { SERVER_KEY } = await import('../data/aiServer')
const { AiError } = await import('./types')

let calls: { url: string; headers: Headers; body: string }[] = []
let answer: () => Response

beforeEach(() => {
  calls = []
  answer = () =>
    Response.json({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [{ type: 'text', text: '{"ok":true}' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 } })
  vi.stubGlobal('fetch', async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), headers: new Headers(init.headers), body: String(init.body ?? '') })
    return answer()
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('the AI on the owner\'s key', () => {
  it('goes to /api/ai with the sign-in, not to Anthropic with a key', async () => {
    await testKey(SERVER_KEY)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toMatch(/^\/api\/ai\?kind=claude/)
    expect(calls[0]!.headers.get('authorization')).toBe('Bearer tok-ali')
    expect(calls[0]!.headers.get('x-api-key')).toBeNull()
    expect(JSON.parse(calls[0]!.body).messages).toBeTruthy()
  })

  it('says the day\'s allowance is used up, in Turkish', async () => {
    answer = () => Response.json({ error: 'daily_quota' }, { status: 429 })
    const err = await testKey(SERVER_KEY).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AiError)
    expect((err as InstanceType<typeof AiError>).kind).toBe('budget')
    expect((err as Error).message).toContain('yarın')
  })

  it('says the owner has not opened it for this account', async () => {
    answer = () => Response.json({ error: 'not_allowed' }, { status: 403 })
    const err = await testKey(SERVER_KEY).catch((e: unknown) => e)
    expect((err as Error).message).toContain('Site sahibi')
  })
})
