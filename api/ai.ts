import { sha256 } from './_account.js'
import { fromApp } from './_origin.js'
import { quotaUsed, spendQuota } from './_quota.js'
import { overLimit, tooMany } from './_rate.js'
import { rest, supabaseOn, supabaseUser } from './_supabase.js'

/**
 * The paid helpers on the owner's keys: the AI (Anthropic), pronunciation scoring (Azure Speech) and natural
 * voices (Google Text-to-Speech). Nobody brings a key; a person uses them only when the owner switched
 * `profiles.ai_enabled` on for them (Supabase), and each person has a daily allowance so one account cannot run
 * up the bill.
 *
 *   GET  /api/ai                         → which helpers this person may use ({ ai, speech, voice, model, reason })
 *   POST /api/ai?kind=claude&beta=1      → an Anthropic Messages request (the SDK's body), answered as Anthropic does
 *   POST /api/ai?kind=speech&locale=xx-XX → a WAV recording, Azure's recognition answer (Pronunciation-Assessment header passes)
 *   GET  /api/ai?kind=voices&lang=xx-XX  → Google's voice list for a language
 *   POST /api/ai?kind=voice              → a Google synthesize request ({ input, voice, audioConfig })
 *
 * Environment (Cloudflare Worker secrets): ANTHROPIC_API_KEY, AZURE_SPEECH_KEY + AZURE_SPEECH_REGION,
 * GOOGLE_TTS_KEY; optional AI_MODEL (default claude-sonnet-5-5) and AI_DAILY_USD (default 0.5). A helper whose key is
 * missing is simply off.
 */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

/** USD per million tokens (input, output), as in src/ai/usage.ts. */
const PRICES: Record<string, [number, number]> = {
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-4-5': [1, 5],
}
const model = () => {
  const m = process.env.AI_MODEL?.trim() ?? ''
  return m in PRICES ? m : 'claude-sonnet-5-5'
}
/** A person's AI spend in a day, in millionths of a dollar (the quota counts whole numbers). */
const dailyMicroUsd = () => Math.round((Number(process.env.AI_DAILY_USD) > 0 ? Number(process.env.AI_DAILY_USD) : 0.5) * 1_000_000)
export const DAILY_AI_CALLS = 200
export const DAILY_SPEECH_CALLS = 300
export const DAILY_VOICE_CHARS = 20_000

const has = (name: string) => !!process.env[name]?.trim()
const helpers = () => ({
  ai: has('ANTHROPIC_API_KEY'),
  speech: has('AZURE_SPEECH_KEY') && /^[a-z0-9]+$/.test(process.env.AZURE_SPEECH_REGION?.trim() ?? ''),
  voice: has('GOOGLE_TTS_KEY'),
})

// Who a token belongs to and whether they may use the helpers: asked of Supabase at most every few minutes per
// instance (each AI request would otherwise wait for two more round trips).
const people = new Map<string, { id: string | null; at: number }>()
const allowedIds = new Map<string, { on: boolean; at: number }>()
const PERSON_MS = 5 * 60_000
const ALLOWED_MS = 2 * 60_000
export const resetAiCache = () => (people.clear(), allowedIds.clear())

async function personOf(request: Request): Promise<string | null> {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const key = await sha256(token)
  const hit = people.get(key)
  if (hit && Date.now() - hit.at < PERSON_MS) return hit.id
  const user = await supabaseUser(request)
  if (people.size > 2000) people.clear()
  people.set(key, { id: user?.id ?? null, at: Date.now() })
  return user?.id ?? null
}

async function aiEnabled(userId: string): Promise<boolean> {
  const hit = allowedIds.get(userId)
  if (hit && Date.now() - hit.at < ALLOWED_MS) return hit.on
  const res = await rest(`profiles?user_id=eq.${userId}&select=ai_enabled`)
  if (!res.ok) throw new Error(`supabase ${res.status}`)
  const on = ((await res.json()) as { ai_enabled?: boolean }[])[0]?.ai_enabled === true
  if (allowedIds.size > 2000) allowedIds.clear()
  allowedIds.set(userId, { on, at: Date.now() })
  return on
}

type Gate = { id: string } | { error: Response }

/** The person behind the request, when they may use the helpers; otherwise the answer to give. */
async function gate(request: Request): Promise<Gate> {
  if (!supabaseOn()) return { error: json({ error: 'off' }, 503) }
  const id = await personOf(request)
  if (!id) return { error: json({ error: 'signed_out' }, 401) }
  try {
    if (!(await aiEnabled(id))) return { error: json({ error: 'not_allowed' }, 403) }
  } catch {
    return { error: json({ error: 'unavailable' }, 502) }
  }
  return { id }
}

const quotaAnswer = () => json({ error: 'daily_quota' }, 429)

// --- Anthropic ---------------------------------------------------------------------------------------------

/** What the app's requests carry; anything else (tools, web search, a different model) is not passed on. */
const CLAUDE_FIELDS = ['max_tokens', 'system', 'messages', 'output_config', 'fallbacks', 'temperature', 'stop_sequences'] as const
const MAX_TOKENS = 16_000
const MAX_BODY = 4_000_000

export function cleanClaudeBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  if (!Array.isArray(b.messages) || !b.messages.length) return null
  const out: Record<string, unknown> = {}
  for (const f of CLAUDE_FIELDS) if (b[f] !== undefined) out[f] = b[f]
  out.model = model()
  out.max_tokens = Math.min(Math.max(1, Number(b.max_tokens) || MAX_TOKENS), MAX_TOKENS)
  return out
}

async function claude(request: Request, id: string, beta: boolean): Promise<Response> {
  if (!helpers().ai) return json({ error: 'off' }, 503)
  const [calls, spent] = await Promise.all([quotaUsed('ai-calls', id), quotaUsed('ai-cost', id)])
  if (calls >= DAILY_AI_CALLS || spent >= dailyMicroUsd()) return quotaAnswer()
  const raw = await request.text()
  if (raw.length > MAX_BODY) return json({ error: 'too large' }, 413)
  let body: Record<string, unknown> | null
  try {
    body = cleanClaudeBody(JSON.parse(raw))
  } catch {
    body = null
  }
  if (!body) return json({ type: 'error', error: { type: 'invalid_request_error', message: 'bad request' } }, 400)
  const betaHeader = request.headers.get('anthropic-beta') ?? ''
  const headers: Record<string, string> = {
    'x-api-key': process.env.ANTHROPIC_API_KEY!.trim(),
    'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
    'content-type': 'application/json',
  }
  if (/^[a-z0-9-]+(,[a-z0-9-]+)*$/.test(betaHeader)) headers['anthropic-beta'] = betaHeader
  await spendQuota('ai-calls', id, 1)
  const res = await fetch(`https://api.anthropic.com/v1/messages${beta ? '?beta=true' : ''}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const text = await res.text()
  if (res.ok) {
    try {
      const u = (JSON.parse(text) as { usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } }).usage ?? {}
      const [inPrice, outPrice] = PRICES[body.model as string] ?? PRICES['claude-sonnet-5-5']!
      const input = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1
      await spendQuota('ai-cost', id, Math.ceil(input * inPrice + (u.output_tokens ?? 0) * outPrice))
    } catch {
      // Not counted: the call allowance still holds.
    }
  }
  return new Response(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' } })
}

// --- Azure Speech ------------------------------------------------------------------------------------------

const LOCALE = /^[a-z]{2}-[A-Z]{2}$/
const MAX_AUDIO = 2_000_000

async function speech(request: Request, id: string, locale: string): Promise<Response> {
  if (!helpers().speech) return json({ error: 'off' }, 503)
  if (!LOCALE.test(locale)) return json({ error: 'bad locale' }, 400)
  if ((await quotaUsed('ai-speech', id)) >= DAILY_SPEECH_CALLS) return quotaAnswer()
  const audio = await request.arrayBuffer()
  if (!audio.byteLength || audio.byteLength > MAX_AUDIO) return json({ error: 'bad audio' }, 413)
  const assessment = request.headers.get('pronunciation-assessment') ?? ''
  await spendQuota('ai-speech', id, 1)
  const region = process.env.AZURE_SPEECH_REGION!.trim()
  const res = await fetch(`https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${locale}&format=detailed`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!.trim(),
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      Accept: 'application/json',
      ...(assessment && assessment.length < 4000 ? { 'Pronunciation-Assessment': assessment } : {}),
    },
    body: audio,
  })
  return new Response(await res.text(), { status: res.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}

// --- Google Text-to-Speech ---------------------------------------------------------------------------------

const TTS = 'https://texttospeech.googleapis.com/v1'

async function voices(lang: string): Promise<Response> {
  if (!helpers().voice) return json({ error: 'off' }, 503)
  if (!LOCALE.test(lang)) return json({ error: 'bad locale' }, 400)
  const res = await fetch(`${TTS}/voices?languageCode=${lang}&key=${encodeURIComponent(process.env.GOOGLE_TTS_KEY!.trim())}`)
  // The list is the same for everyone: browsers may keep it for a day.
  return new Response(await res.text(), { status: res.status, headers: { 'content-type': 'application/json', 'cache-control': res.ok ? 'private, max-age=86400' : 'no-store' } })
}

async function voice(request: Request, id: string): Promise<Response> {
  if (!helpers().voice) return json({ error: 'off' }, 503)
  let body: { input?: { text?: unknown }; voice?: { languageCode?: unknown; name?: unknown }; audioConfig?: { speakingRate?: unknown } }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: 'bad request' }, 400)
  }
  const text = typeof body.input?.text === 'string' ? body.input.text : ''
  const lang = String(body.voice?.languageCode ?? '')
  const name = String(body.voice?.name ?? '')
  const rate = Number(body.audioConfig?.speakingRate ?? 1)
  if (!text || text.length > 1500 || !LOCALE.test(lang) || !/^[A-Za-z0-9-]{3,60}$/.test(name)) return json({ error: 'bad request' }, 400)
  if ((await quotaUsed('ai-voice', id)) + text.length > DAILY_VOICE_CHARS) return quotaAnswer()
  await spendQuota('ai-voice', id, text.length)
  const res = await fetch(`${TTS}/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_KEY!.trim())}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: lang, name }, audioConfig: { audioEncoding: 'MP3', speakingRate: Math.min(Math.max(Number.isFinite(rate) ? rate : 1, 0.25), 4) } }),
  })
  return new Response(await res.text(), { status: res.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}

// --- Handlers ----------------------------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  if (overLimit(request, 'ai-read', 120)) return tooMany()
  const q = new URL(request.url).searchParams
  if (q.get('kind') === 'voices') {
    const g = await gate(request)
    return 'error' in g ? g.error : voices(q.get('lang') ?? '')
  }
  const off = { ai: false, speech: false, voice: false }
  if (!supabaseOn()) return json({ ...off, reason: 'off' })
  const g = await gate(request)
  if ('error' in g) {
    const reason = ((await g.error.json()) as { error: string }).error
    return json({ ...off, reason })
  }
  return json({ ...helpers(), model: model() })
}

export async function POST(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  if (overLimit(request, 'ai', 40)) return tooMany()
  const q = new URL(request.url).searchParams
  const g = await gate(request)
  if ('error' in g) return g.error
  const kind = q.get('kind')
  if (kind === 'claude') return claude(request, g.id, q.get('beta') === '1')
  if (kind === 'speech') return speech(request, g.id, q.get('locale') ?? '')
  if (kind === 'voice') return voice(request, g.id)
  return json({ error: 'unknown kind' }, 400)
}
