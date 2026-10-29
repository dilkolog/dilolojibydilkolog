import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The daily counts live in the Blob store (api/_quota.ts): an in-memory one.
const blobs = new Map<string, string>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: string) => void blobs.set(path, body),
  get: async (path: string) => (blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)).body, blob: { etag: 'e' } } : null),
  list: async () => ({ blobs: [] }),
  del: async () => undefined,
}))

const ai = await import('../../api/ai')
const { resetRate } = await import('../../api/_rate')
const { resetQuota } = await import('../../api/_quota')

const SB = 'https://proj.supabase.co'
const ALI = '11111111-1111-1111-1111-111111111111'
const VELI = '22222222-2222-2222-2222-222222222222'
const TOKENS: Record<string, string> = { 'tok-ali': ALI, 'tok-veli': VELI }
let allowed = new Set<string>()
let sent: { url: string; headers: Record<string, string>; body: string }[] = []
let anthropicStatus = 200

async function fakeFetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  const url = new URL(String(input))
  const headers = Object.fromEntries(new Headers(init.headers).entries())
  if (url.origin === SB && url.pathname === '/auth/v1/user') {
    const id = TOKENS[(headers.authorization ?? '').replace('Bearer ', '')]
    return id ? Response.json({ id, email: 'x@example.com' }) : Response.json({}, { status: 401 })
  }
  if (url.origin === SB && url.pathname === '/rest/v1/profiles') {
    const id = url.searchParams.get('user_id')?.replace('eq.', '') ?? ''
    return Response.json([{ ai_enabled: allowed.has(id) }])
  }
  const body = init.body instanceof ArrayBuffer ? `<${init.body.byteLength} bytes>` : String(init.body ?? '')
  sent.push({ url: url.href, headers, body })
  if (url.hostname === 'api.anthropic.com') {
    return anthropicStatus === 200
      ? Response.json({ id: 'msg', type: 'message', content: [{ type: 'text', text: '{"ok":true}' }], usage: { input_tokens: 1000, output_tokens: 500 } })
      : Response.json({ type: 'error', error: { type: 'overloaded_error' } }, { status: anthropicStatus })
  }
  if (url.hostname.endsWith('stt.speech.microsoft.com')) return Response.json({ RecognitionStatus: 'Success' })
  if (url.hostname === 'texttospeech.googleapis.com') return Response.json({ audioContent: 'AAAA' })
  return new Response('not found', { status: 404 })
}

const APP = { 'sec-fetch-site': 'same-origin' }
const req = (query: string, token: string | null, init: RequestInit = {}) =>
  new Request(`https://app.test/api/ai${query}`, { ...init, headers: { ...APP, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init.headers as Record<string, string>) } })
const claude = (token: string | null, body: unknown) => ai.POST(req('?kind=claude&beta=1', token, { method: 'POST', body: JSON.stringify(body), headers: { 'anthropic-beta': 'server-side-fallback-2026-07-01' } }))
const ask = { model: 'claude-opus-5-5', max_tokens: 99_999, messages: [{ role: 'user', content: 'ping' }], tools: [{ name: 'web_search' }], system: 'Be brief.' }

beforeEach(() => {
  blobs.clear()
  resetRate()
  resetQuota()
  ai.resetAiCache()
  allowed = new Set([ALI])
  sent = []
  anthropicStatus = 200
  vi.stubEnv('SUPABASE_URL', SB)
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-owner')
  vi.stubEnv('AZURE_SPEECH_KEY', 'azure-owner')
  vi.stubEnv('AZURE_SPEECH_REGION', 'francecentral')
  vi.stubEnv('GOOGLE_TTS_KEY', 'google-owner')
  vi.stubEnv('AI_MODEL', '')
  vi.stubEnv('AI_DAILY_USD', '')
  vi.stubGlobal('fetch', fakeFetch)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('/api/ai: the owner\'s keys for the people the owner allowed', () => {
  it('says what is open: everything for an allowed person, nothing (with the reason) for others', async () => {
    expect(await (await ai.GET(req('', 'tok-ali'))).json()).toEqual({ ai: true, speech: true, voice: true, model: 'claude-sonnet-5-5' })
    expect(await (await ai.GET(req('', 'tok-veli'))).json()).toEqual({ ai: false, speech: false, voice: false, reason: 'not_allowed' })
    expect(await (await ai.GET(req('', null))).json()).toEqual({ ai: false, speech: false, voice: false, reason: 'signed_out' })
  })

  it('a helper without its key on the server is off', async () => {
    vi.stubEnv('GOOGLE_TTS_KEY', '')
    expect(await (await ai.GET(req('', 'tok-ali'))).json()).toMatchObject({ ai: true, speech: true, voice: false })
  })

  it('sends an allowed person\'s request with the owner\'s key, the server\'s model, a capped length and only the known fields', async () => {
    const res = await claude('tok-ali', ask)
    expect(res.status).toBe(200)
    expect(sent).toHaveLength(1)
    const out = sent[0]!
    expect(out.url).toBe('https://api.anthropic.com/v1/messages?beta=true')
    expect(out.headers['x-api-key']).toBe('sk-ant-owner')
    expect(out.headers['anthropic-beta']).toBe('server-side-fallback-2026-07-01')
    const body = JSON.parse(out.body) as Record<string, unknown>
    expect(body).toEqual({ model: 'claude-sonnet-5-5', max_tokens: 16_000, system: 'Be brief.', messages: ask.messages })
  })

  it('refuses people the owner did not allow, and requests with no sign-in, without calling Anthropic', async () => {
    expect((await claude('tok-veli', ask)).status).toBe(403)
    expect((await claude(null, ask)).status).toBe(401)
    expect((await claude('tok-bad', ask)).status).toBe(401)
    expect(sent).toHaveLength(0)
  })

  it('stops a person for the day once their spend reaches the allowance', async () => {
    // 1000 input + 500 output tokens on Sonnet: 7,000 millionths of a dollar a call; an allowance of 0.01 $ holds one.
    vi.stubEnv('AI_DAILY_USD', '0.01')
    expect((await claude('tok-ali', ask)).status).toBe(200)
    expect((await claude('tok-ali', ask)).status).toBe(200)
    const third = await claude('tok-ali', ask)
    expect(third.status).toBe(429)
    expect(await third.json()).toEqual({ error: 'daily_quota' })
    expect(sent).toHaveLength(2)
  })

  it('passes Anthropic\'s own errors back as they are', async () => {
    anthropicStatus = 529
    expect((await claude('tok-ali', ask)).status).toBe(529)
  })

  it('rejects a body that is not a messages request', async () => {
    expect((await claude('tok-ali', { model: 'x' })).status).toBe(400)
    expect(sent).toHaveLength(0)
  })

  it('scores a recording with the owner\'s Azure key, passing the assessment settings', async () => {
    const res = await ai.POST(req('?kind=speech&locale=fr-FR', 'tok-ali', { method: 'POST', body: new Uint8Array(64), headers: { 'pronunciation-assessment': 'eyJ9' } }))
    expect(res.status).toBe(200)
    expect(sent[0]!.url).toContain('https://francecentral.stt.speech.microsoft.com/')
    expect(sent[0]!.url).toContain('language=fr-FR')
    expect(sent[0]!.headers['ocp-apim-subscription-key']).toBe('azure-owner')
    expect(sent[0]!.headers['pronunciation-assessment']).toBe('eyJ9')
    expect((await ai.POST(req('?kind=speech&locale=fr', 'tok-ali', { method: 'POST', body: new Uint8Array(64) }))).status).toBe(400)
  })

  it('speaks with the owner\'s Google key and counts the characters', async () => {
    const speak = (text: string) =>
      ai.POST(req('?kind=voice', 'tok-ali', { method: 'POST', body: JSON.stringify({ input: { text }, voice: { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' }, audioConfig: { speakingRate: 1 } }) }))
    expect((await speak('Bonjour')).status).toBe(200)
    expect(sent[0]!.url).toContain('key=google-owner')
    expect((await speak('x'.repeat(1501))).status).toBe(400)
  })
})

describe('cleanClaudeBody', () => {
  it('keeps the request\'s content, drops everything else and sets the model', () => {
    expect(ai.cleanClaudeBody({ messages: [{ role: 'user', content: 'a' }], output_config: { effort: 'low' }, mcp_servers: [{}], container: 'c' })).toEqual({
      model: 'claude-sonnet-5-5',
      max_tokens: 16_000,
      messages: [{ role: 'user', content: 'a' }],
      output_config: { effort: 'low' },
    })
    expect(ai.cleanClaudeBody([])).toBeNull()
    expect(ai.cleanClaudeBody({ messages: [] })).toBeNull()
  })
})
