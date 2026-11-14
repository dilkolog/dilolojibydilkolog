import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, MAX_REF, POST, resetVoices } from '../../api/speech'

// Approval is tested elsewhere; here the account check passes (and there is no account, so no allowance is counted).
vi.mock('../../api/_account', async (original) => ({ ...(await original<typeof import('../../api/_account')>()), requireApproved: async () => null, accountOf: async () => null }))

const app = (path: string, init: RequestInit = {}, origin = 'https://diloloji.com') => new Request(`https://diloloji.com/api/speech${path}`, { ...init, headers: { origin, ...(init.headers as Record<string, string> | undefined) } })
const post = (path: string, body: unknown, origin?: string) => app(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, origin)
const wav = (n = 40_000) => new Uint8Array(n).buffer

describe('/api/speech', () => {
  let calls: { url: string; init?: RequestInit }[]
  const headersOf = (call: { init?: RequestInit }) => (call.init?.headers ?? {}) as Record<string, string>
  let reply: (url: string) => Response
  beforeEach(() => {
    resetVoices()
    calls = []
    vi.stubEnv('GOOGLE_TTS_KEY', 'g-key')
    vi.stubEnv('AZURE_SPEECH_KEY', 'a-key')
    vi.stubEnv('AZURE_SPEECH_REGION', 'francecentral')
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return reply(url)
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('says which of the two services the server has a key for', async () => {
    expect(await (await GET(app(''))).json()).toEqual({ assess: true, tts: true })
    vi.stubEnv('AZURE_SPEECH_REGION', '')
    vi.stubEnv('GOOGLE_TTS_KEY', '')
    expect(await (await GET(app(''))).json()).toEqual({ assess: false, tts: false })
  })

  it('only the app itself may ask', async () => {
    reply = () => new Response('{}')
    expect((await GET(app('', {}, 'https://evil.example'))).status).toBe(403)
    expect((await POST(post('?tts=1', { text: 'Bonjour', language: 'fr', voice: 'fr-FR-Neural2-A' }, 'https://evil.example'))).status).toBe(403)
    expect((await POST(app('?assess=1&l=fr', { method: 'POST', body: wav() }, 'https://evil.example'))).status).toBe(403)
    expect(calls).toEqual([])
  })

  describe('voices', () => {
    const list = { voices: [{ name: 'fr-FR-Standard-A', languageCodes: ['fr-FR'] }, { name: 'fr-FR-Wavenet-B', languageCodes: ['fr-FR'] }, { name: 'fr-FR-Neural2-C', languageCodes: ['fr-FR'] }, { name: 'fr-CA-Neural2-A', languageCodes: ['fr-CA'] }] }

    it('lists the best kind first, only for the language, and keeps the answer for a while', async () => {
      reply = () => Response.json(list)
      expect(await (await GET(app('?voices=fr'))).json()).toEqual({ voices: ['fr-FR-Neural2-C'] })
      await GET(app('?voices=fr'))
      expect(calls).toHaveLength(1)
      expect(calls[0].url).toContain('languageCode=fr-FR')
      // The key goes in a header, never in the address.
      expect(calls[0].url).not.toContain('g-key')
      expect(headersOf(calls[0])['x-goog-api-key']).toBe('g-key')
    })

    it('refuses a language it does not teach and says when Google is down', async () => {
      reply = () => new Response('', { status: 500 })
      expect((await GET(app('?voices=de'))).status).toBe(400)
      expect((await GET(app('?voices=en'))).status).toBe(502)
      vi.stubEnv('GOOGLE_TTS_KEY', '')
      expect((await GET(app('?voices=en'))).status).toBe(503)
    })
  })

  describe('speaking', () => {
    const ok = { text: 'Bonjour', language: 'fr', voice: 'fr-FR-Neural2-A', rate: 1 }
    const mp3 = btoa('ID3-fake-audio')
    const offered = { voices: [{ name: 'fr-FR-Neural2-A', languageCodes: ['fr-FR'] }, { name: 'fr-FR-Standard-B', languageCodes: ['fr-FR'] }] }
    /** Google: the voice list for /voices, `synth` for the speech itself. */
    const google = (synth: () => Response) => (url: string) => (url.includes('/voices') ? Response.json(offered) : synth())
    const spoken = () => calls.filter((c) => c.url.includes('text:synthesize'))

    it('sends the text to Google with the key in a header and answers the audio itself', async () => {
      reply = google(() => Response.json({ audioContent: mp3 }))
      const res = await POST(post('?tts=1', { ...ok, rate: 9 }))
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('audio/mpeg')
      expect(new TextDecoder().decode(await res.arrayBuffer())).toBe('ID3-fake-audio')
      const sent = JSON.parse(String(spoken()[0].init?.body))
      expect(sent).toEqual({ input: { text: 'Bonjour' }, voice: { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' }, audioConfig: { audioEncoding: 'MP3', speakingRate: 2 } })
      expect(spoken()[0].url).not.toContain('g-key')
    })

    it('does not pass on a request that is not an ordinary sentence in a real voice of that language', async () => {
      reply = google(() => Response.json({ audioContent: mp3 }))
      for (const body of [{ ...ok, text: '' }, { ...ok, text: 'a'.repeat(501) }, { ...ok, language: 'de' }, { ...ok, voice: 'es-ES-Neural2-A' }, { ...ok, voice: 'fr-FR-x; drop table' }, { ...ok, voice: undefined }]) {
        expect((await POST(post('?tts=1', body))).status).toBe(400)
      }
      expect(calls).toEqual([])
    })

    it('speaks only in a voice the server offers: a dearer tier of the same language is refused', async () => {
      reply = google(() => Response.json({ audioContent: mp3 }))
      // Right language and shape, but not in the list (another, dearer tier).
      expect((await POST(post('?tts=1', { ...ok, voice: 'fr-FR-Studio-A' }))).status).toBe(400)
      expect((await POST(post('?tts=1', { ...ok, voice: 'fr-FR-Chirp3-HD-Aoede' }))).status).toBe(400)
      expect(spoken()).toEqual([])
      // The list itself cannot be had: nothing is spoken.
      resetVoices()
      reply = () => new Response('', { status: 500 })
      expect((await POST(post('?tts=1', ok))).status).toBe(502)
    })

    it('says "unavailable" when the owner\'s key or project is what failed, and "busy" when Google asks to slow down', async () => {
      reply = google(() => new Response('billing', { status: 403 }))
      expect((await POST(post('?tts=1', ok))).status).toBe(502)
      reply = google(() => new Response('', { status: 429 }))
      expect((await POST(post('?tts=1', ok))).status).toBe(429)
    })

    it('is off without the key', async () => {
      vi.stubEnv('GOOGLE_TTS_KEY', '')
      expect((await POST(post('?tts=1', ok))).status).toBe(503)
    })
  })

  describe('scoring', () => {
    const request = (extra: Record<string, string> = {}, query = '?assess=1&l=fr', body: BodyInit = wav()) =>
      app(query, { method: 'POST', headers: { 'content-type': 'audio/wav', 'x-ref-text': encodeURIComponent('Je suis à la maison'), ...extra }, body })
    const assessment = { RecognitionStatus: 'Success', NBest: [{ PronunciationAssessment: { PronScore: 88 } }] }

    it('builds the Azure request itself: region, language, the sentence in the assessment header, key in a header', async () => {
      reply = () => Response.json(assessment)
      const res = await POST(request())
      expect(await res.json()).toEqual(assessment)
      expect(calls[0].url).toBe('https://francecentral.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=fr-FR&format=detailed')
      const headers = calls[0].init?.headers as Record<string, string>
      expect(headers['Ocp-Apim-Subscription-Key']).toBe('a-key')
      const sent = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(headers['Pronunciation-Assessment']), (c) => c.charCodeAt(0))))
      expect(sent).toMatchObject({ ReferenceText: 'Je suis à la maison', GradingSystem: 'HundredMark', EnableMiscue: 'True' })
      expect(sent.EnableProsodyAssessment).toBeUndefined()
    })

    it('Spanish follows the learner\'s variety and English also gets the prosody score', async () => {
      reply = () => Response.json(assessment)
      await POST(request({}, '?assess=1&l=es&v=mx'))
      expect(calls[0].url).toContain('language=es-MX')
      await POST(request({}, '?assess=1&l=en'))
      expect(calls[1].url).toContain('language=en-US')
      const header = headersOf(calls[1])['Pronunciation-Assessment']
      expect(JSON.parse(atob(header)).EnableProsodyAssessment).toBe('True')
    })

    it('refuses what is not a recording of a short sentence', async () => {
      reply = () => Response.json(assessment)
      expect((await POST(request({}, '?assess=1&l=de'))).status).toBe(400)
      expect((await POST(request({ 'x-ref-text': '' }))).status).toBe(400)
      expect((await POST(request({ 'x-ref-text': encodeURIComponent('a'.repeat(MAX_REF + 1)) }))).status).toBe(400)
      expect((await POST(request({}, '?assess=1&l=fr', new Uint8Array(100).buffer))).status).toBe(400)
      expect((await POST(request({ 'content-length': '5000000' }))).status).toBe(413)
      expect(calls).toEqual([])
    })

    it('a key Azure turns down is the owner\'s to fix: the person is told it is unavailable', async () => {
      reply = () => new Response('', { status: 401 })
      expect((await POST(request())).status).toBe(502)
      reply = () => new Response('', { status: 429 })
      expect((await POST(request())).status).toBe(429)
    })

    it('is off without the key or with a region that is not one', async () => {
      vi.stubEnv('AZURE_SPEECH_REGION', 'evil.example/x')
      expect((await POST(request())).status).toBe(503)
    })
  })

  it('an unknown POST is a bad request', async () => {
    expect((await POST(post('', {}))).status).toBe(400)
  })
})
