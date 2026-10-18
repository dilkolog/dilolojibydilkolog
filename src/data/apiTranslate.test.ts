import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoint, fromApp, GET } from '../../api/translate'

// The owner's approval is tested in access.test.ts; here the account check always passes.
vi.mock('../../api/_account', async (original) => ({ ...(await original<typeof import('../../api/_account')>()), requireApproved: async () => null }))

const app = (path: string, origin = 'https://diloloji.com') => new Request(`https://diloloji.com/api/translate${path}`, { headers: { origin } })

describe('/api/translate', () => {
  let calls: { url: string; init?: RequestInit }[]
  const answer = (status: number, body: unknown) => {
    calls = []
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify(body), { status })
    })
  }
  beforeEach(() => vi.stubEnv('DEEPL_AUTH_KEY', 'abc123:fx'))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('without a key on the server, translation is off', async () => {
    vi.stubEnv('DEEPL_AUTH_KEY', '')
    answer(200, {})
    expect((await GET(app('?text=Bonjour&from=fr&to=tr'))).status).toBe(503)
    expect(calls).toEqual([])
  })

  it('only the app itself may ask; one sentence of a sane length, known languages', async () => {
    answer(200, { translations: [{ text: 'Merhaba' }] })
    expect((await GET(app('?text=Bonjour&to=tr', 'https://evil.example'))).status).toBe(403)
    expect((await GET(new Request('https://diloloji.com/api/translate?text=Bonjour&to=tr'))).status).toBe(403)
    expect((await GET(app(`?text=${'a'.repeat(601)}&to=tr`))).status).toBe(400)
    expect((await GET(app('?text=Bonjour&to=de'))).status).toBe(400)
    expect(calls).toEqual([])
    expect(fromApp(new Request('https://x/', { headers: { referer: 'https://diloloji-git-deepl-ali.vercel.app/words' } }))).toBe(true)
    expect(fromApp(new Request('https://x/', { headers: { origin: 'http://localhost:5174' } }))).toBe(true)
    expect(fromApp(new Request('https://x/', { headers: { origin: 'https://diloloji.com' } }))).toBe(true)
    expect(fromApp(new Request('https://x/', { headers: { origin: 'https://www.diloloji.com' } }))).toBe(true)
    expect(fromApp(new Request('https://x/', { headers: { origin: 'https://evil-diloloji.com' } }))).toBe(false)
    expect(fromApp(new Request('https://x/', { headers: { origin: 'https://diloloji.com.evil.com' } }))).toBe(false)
  })

  it('asks DeepL with the key in the header, and lets the CDN keep the answer', async () => {
    answer(200, { translations: [{ text: 'Kedi uyuyor.' }] })
    const res = await GET(app('?text=Le%20chat%20dort.&from=fr&to=tr'))
    expect(await res.json()).toEqual({ translation: 'Kedi uyuyor.' })
    expect(res.headers.get('cache-control')).toContain('private')
    expect(calls[0].url).toBe('https://api-free.deepl.com/v2/translate')
    expect(new Headers(calls[0].init!.headers).get('authorization')).toBe('DeepL-Auth-Key abc123:fx')
    expect(JSON.parse(String(calls[0].init!.body))).toEqual({ text: ['Le chat dort.'], target_lang: 'TR', source_lang: 'FR' })
    expect(endpoint('pro-key')).toBe('https://api.deepl.com')
  })

  it('a month used up says so (and is not cached); usage is reported', async () => {
    answer(456, {})
    const full = await GET(app('?text=Bonjour&to=tr'))
    expect(full.status).toBe(429)
    expect(await full.json()).toEqual({ error: 'quota' })
    expect(full.headers.get('cache-control')).toBe('no-store')
    answer(200, { character_count: 1234, character_limit: 500000 })
    expect(await (await GET(app('?usage=1'))).json()).toEqual({ count: 1234, limit: 500000 })
    expect(calls[0].url).toBe('https://api-free.deepl.com/v2/usage')
  })
})

describe('translate (in the app)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks once per sentence, and names a full month plainly', async () => {
    const { translate, TranslateError } = await import('./translate')
    let asked = 0
    vi.stubGlobal('fetch', async (url: string) => {
      asked++
      return url.includes('Plein')
        ? new Response(JSON.stringify({ error: 'quota' }), { status: 429 })
        : new Response(JSON.stringify({ translation: 'Kedi uyuyor.' }))
    })
    expect(await translate('Le *chat* dort.', 'fr')).toBe('Kedi uyuyor.')
    expect(await translate('Le chat dort.', 'fr')).toBe('Kedi uyuyor.')
    expect(asked).toBe(1)
    await expect(translate('Plein.', 'fr')).rejects.toThrow(TranslateError)
    await expect(translate('Plein.', 'fr')).rejects.toThrow(/kotası doldu/)
    expect(asked).toBe(3)
  })
})
