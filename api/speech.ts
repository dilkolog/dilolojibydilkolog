/**
 * The two speech services that cost money, on the owner's keys, so nobody has to bring one (like /api/ai):
 *
 * GET  /api/speech                      → { assess, tts }: which of the two the server has a key for.
 * GET  /api/speech?voices=fr            → { voices: [...] }: the natural voices for a language (Google Cloud TTS).
 * POST /api/speech?tts=1                → the spoken text as audio/mpeg. Body JSON { text, language, voice, rate }.
 * POST /api/speech?assess=1&l=fr[&v=mx] → Azure pronunciation scores for a 16 kHz mono WAV (≤ 1.2 MB), the sentence it
 *                                         should say in the x-ref-text header (URL-encoded, ≤ MAX_REF characters).
 *
 * Secrets (Worker): AZURE_SPEECH_KEY + AZURE_SPEECH_REGION, GOOGLE_TTS_KEY. Only the app's own pages and approved
 * accounts may ask; each account has a daily allowance (api/_quota.ts: DAILY_TTS_CHARS characters, DAILY_CALLS.assess
 * scorings), and the server builds the Azure request itself, so it cannot be used as a general speech-to-text service.
 */
import { accountOf, requireApproved } from './_account.js'
import { fromApp } from './_origin.js'
import { dailyQuotaReached, DAILY_TTS_CHARS, overDaily, quotaGiveBack, quotaTake } from './_quota.js'
import { overLimit, tooMany } from './_rate.js'
import { limitOf } from './_settings.js'

export { fromApp }

/** The longest text spoken in one request: a sentence or two. */
export const MAX_TTS_CHARS = 500
/** The longest sentence a recording is scored against. */
export const MAX_REF = 400
/** 16 kHz mono 16-bit: 32 kB a second, so this is about half a minute (Azure's short-audio limit is 60 s). */
export const MAX_WAV = 1_200_000
export const LANGS = { en: 'en-US', fr: 'fr-FR', es: 'es-ES' } as const
type Lang = keyof typeof LANGS

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
const azureKey = () => process.env.AZURE_SPEECH_KEY?.trim() ?? ''
const azureRegion = () => (process.env.AZURE_SPEECH_REGION?.trim().toLowerCase() ?? '')
const azureOn = () => !!azureKey() && /^[a-z0-9]+$/.test(azureRegion())
const googleKey = () => process.env.GOOGLE_TTS_KEY?.trim() ?? ''

const isLang = (v: unknown): v is Lang => typeof v === 'string' && Object.prototype.hasOwnProperty.call(LANGS, v)

// ---- voices -----------------------------------------------------------------------------------------------------
const VOICES = new Map<Lang, { at: number; list: string[] }>()
const VOICES_TTL = 6 * 3_600_000
export const resetVoices = () => VOICES.clear()

/** Neural voices for a language (Neural2 first; Google is phasing it out on some accounts, then WaveNet, Chirp 3 HD, Standard). */
async function voicesFor(language: Lang, now = Date.now()): Promise<string[]> {
  const kept = VOICES.get(language)
  if (kept && now - kept.at < VOICES_TTL) return kept.list
  const res = await fetch(`https://texttospeech.googleapis.com/v1/voices?languageCode=${LANGS[language]}`, {
    headers: { 'x-goog-api-key': googleKey() },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(String(res.status))
  const { voices = [] } = (await res.json()) as { voices?: { name: string; languageCodes: string[] }[] }
  const own = voices.filter((v) => v.languageCodes.includes(LANGS[language])).map((v) => v.name)
  const list = ['Neural2', 'Wavenet', 'Chirp3-HD', 'Standard'].map((kind) => own.filter((n) => n.includes(kind))).find((l) => l.length) ?? []
  VOICES.set(language, { at: now, list })
  return list
}

/** A voice name shaped like one the API lists for this language (checked against the list itself before it is paid for). */
const validVoice = (voice: unknown, language: Lang): voice is string => typeof voice === 'string' && voice.startsWith(`${LANGS[language]}-`) && /^[A-Za-z0-9-]{5,60}$/.test(voice)

// ---- handlers ---------------------------------------------------------------------------------------------------
export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const denied = await requireApproved(request)
  if (denied) return denied
  const params = new URL(request.url).searchParams
  const language = params.get('voices')
  if (language === null) return json({ assess: azureOn(), tts: !!googleKey() })
  if (!googleKey()) return json({ error: 'not configured' }, 503)
  if (!isLang(language)) return json({ error: 'bad language' }, 400)
  if (overLimit(request, 'speech-voices', 20)) return tooMany()
  try {
    return Response.json({ voices: await voicesFor(language) }, { headers: { 'cache-control': 'private, max-age=21600' } })
  } catch {
    return json({ error: 'unavailable' }, 502)
  }
}

export async function POST(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  if (params.get('tts')) return speak(request)
  if (params.get('assess')) return assess(request, params)
  return json({ error: 'bad request' }, 400)
}

async function speak(request: Request): Promise<Response> {
  if (!googleKey()) return json({ error: 'not configured' }, 503)
  const denied = await requireApproved(request)
  if (denied) return denied
  if (overLimit(request, 'speech-tts', 60)) return tooMany()
  const body = (await request.json().catch(() => null)) as { text?: unknown; language?: unknown; voice?: unknown; rate?: unknown } | null
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text || text.length > MAX_TTS_CHARS || !isLang(body?.language) || !validVoice(body.voice, body.language)) return json({ error: 'bad request' }, 400)
  const rate = typeof body?.rate === 'number' && Number.isFinite(body.rate) ? Math.min(2, Math.max(0.25, body.rate)) : 1
  // Only the voices the server offers (one tier, voicesFor): the allowance counts characters, and a dearer tier would
  // spend more of the owner's free month with the same count.
  const offered = await voicesFor(body.language).catch(() => null)
  if (!offered) return json({ error: 'unavailable' }, 502)
  if (!offered.includes(body.voice)) return json({ error: 'bad request' }, 400)
  const account = await accountOf(request).catch(() => null)
  // Set aside before the call (requests sent at once cannot all find room), given back if it fails.
  if (account && !(await quotaTake('tts', account, text.length, await limitOf('ttsChars', DAILY_TTS_CHARS)))) return dailyQuotaReached()
  const giveBack = async () => {
    if (account) await quotaGiveBack('tts', account, text.length)
  }

  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': googleKey() },
    body: JSON.stringify({ input: { text }, voice: { languageCode: LANGS[body.language], name: body.voice }, audioConfig: { audioEncoding: 'MP3', speakingRate: rate } }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)
  if (!res?.ok) await giveBack()
  if (!res) return json({ error: 'unavailable' }, 502)
  if (res.status === 429) return json({ error: 'busy' }, 429)
  if (!res.ok) {
    // 400/403 here are the owner's key or project (billing, API off): logged, shown to the person as "unavailable".
    console.error('[speech-tts]', res.status, (await res.text().catch(() => '')).slice(0, 200))
    return json({ error: 'unavailable' }, 502)
  }
  const { audioContent } = (await res.json().catch(() => ({}))) as { audioContent?: string }
  if (!audioContent) return json({ error: 'unavailable' }, 502)
  const bytes = Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0))
  // The same text in the same voice sounds the same: the browser keeps it (private: a shared cache would reach callers who were never approved).
  return new Response(bytes, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'private, max-age=31536000' } })
}

async function assess(request: Request, params: URLSearchParams): Promise<Response> {
  if (!azureOn()) return json({ error: 'not configured' }, 503)
  const denied = await requireApproved(request)
  if (denied) return denied
  const language = params.get('l')
  if (!isLang(language)) return json({ error: 'bad language' }, 400)
  let reference = ''
  try {
    reference = decodeURIComponent(request.headers.get('x-ref-text') ?? '').trim()
  } catch {
    // stays empty
  }
  if (!reference || reference.length > MAX_REF) return json({ error: 'bad text' }, 400)
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_WAV) return json({ error: 'too large' }, 413)
  if (overLimit(request, 'speech-assess', 20)) return tooMany()
  if (await overDaily(request, 'assess')) return dailyQuotaReached()
  const audio = await request.arrayBuffer()
  if (audio.byteLength < 1000 || audio.byteLength > MAX_WAV) return json({ error: 'bad audio' }, 400)

  const locale = language === 'es' && params.get('v') === 'mx' ? 'es-MX' : LANGS[language]
  const header = btoa(
    String.fromCharCode(
      ...new TextEncoder().encode(
        JSON.stringify({
          ReferenceText: reference,
          GradingSystem: 'HundredMark',
          Granularity: 'Phoneme',
          Dimension: 'Comprehensive',
          EnableMiscue: 'True',
          // Prosody (stress, intonation, rhythm) is scored for English only.
          ...(language === 'en' ? { EnableProsodyAssessment: 'True' } : {}),
        }),
      ),
    ),
  )
  const res = await fetch(`https://${azureRegion()}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${locale}&format=detailed`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': azureKey(), 'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000', Accept: 'application/json', 'Pronunciation-Assessment': header },
    body: audio,
    signal: AbortSignal.timeout(20000),
  }).catch(() => null)
  if (!res) return json({ error: 'unavailable' }, 502)
  if (res.status === 429) return json({ error: 'busy' }, 429)
  if (!res.ok) {
    console.error('[speech-assess]', res.status, (await res.text().catch(() => '')).slice(0, 200))
    return json({ error: res.status === 400 ? 'bad audio' : 'unavailable' }, res.status === 400 ? 400 : 502)
  }
  return json(await res.json().catch(() => ({})))
}
