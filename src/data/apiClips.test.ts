import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../../api/clips'
import { GET as GET_YOUTUBE } from '../../api/youtube'

// The owner's approval is tested in access.test.ts; here the account check always passes.
vi.mock('../../api/_account', async (original) => ({ ...(await original<typeof import('../../api/_account')>()), requireApproved: async () => null }))

const TIMED = '<timedtext><body><p t="1000" d="2000">Il faut décider maintenant.</p><p t="3000" d="2000">Autre chose.</p></body></timedtext>'
const player = (tracks: unknown[]) => ({ playabilityStatus: { status: 'OK' }, videoDetails: { title: 'Un jour', author: 'Chaîne' }, captions: { playerCaptionsTracklistRenderer: { captionTracks: tracks } } })

/** YouTube's three services answered by hand. */
function stubYouTube(opts: { search?: unknown; searchStatus?: number; tracks?: unknown[] } = {}) {
  vi.stubGlobal('fetch', async (url: string) => {
    if (url.includes('googleapis.com/youtube/v3/search')) {
      const status = opts.searchStatus ?? 200
      return new Response(JSON.stringify(opts.search ?? { items: [{ id: { videoId: 'abc12345678' }, snippet: { title: 'Un jour', channelTitle: 'Chaîne' } }, { id: {} }] }), { status })
    }
    if (url.includes('youtubei/v1/player')) return new Response(JSON.stringify(player(opts.tracks ?? [{ baseUrl: 'https://yt/timedtext', languageCode: 'fr' }])))
    return new Response(TIMED)
  })
}

const FROM_APP = { 'sec-fetch-site': 'same-origin' }
const call = (q: string) => GET(new Request(`https://x/api/clips?${q}`, { headers: FROM_APP }))

describe('/api/clips', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('answers only the app\'s own pages, so a stranger cannot use up the YouTube quota', async () => {
    expect((await GET(new Request('https://x/api/clips?q=décider&lang=fr'))).status).toBe(403)
    expect((await GET_YOUTUBE(new Request('https://x/api/youtube?v=abc12345678&lang=fr'))).status).toBe(403)
    expect((await GET(new Request('https://x/api/clips?q=décider&lang=fr', { headers: { origin: 'https://evil.example' } }))).status).toBe(403)
  })

  it('refuses bad requests and says when no YouTube key is set', async () => {
    expect((await call('lang=fr')).status).toBe(400)
    expect((await call('q=décider&lang=de')).status).toBe(400)
    expect((await call(`q=${'x'.repeat(41)}&lang=fr`)).status).toBe(400)
    vi.stubEnv('YOUTUBE_API_KEY', '')
    vi.stubGlobal('fetch', async () => new Response('offline', { status: 503 }))
    const res = await call('q=d%C3%A9cider&lang=fr')
    expect(res.status).toBe(501)
    expect(await res.json()).toEqual({ error: 'no key' })
  })

  it('serves clips directly from YouGlish + oEmbed even without a YouTube API key', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '')
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('youglish.com/pronounce/')) {
        return new Response(
          `<script>params.jsonData = '{\\"results\\":[{\\"vid\\":\\"4Fx-0Wrw0co\\",\\"start\\":\\"182\\",\\"end\\":\\"185\\",\\"display\\":\\"Nous allons d\\u00E9cider ensemble.\\",\\"ban\\":\\"0\\",\\"src\\":\\"YT\\"}]}';</script>`,
        )
      }
      if (url.includes('youtube.com/oembed')) {
        return Response.json({ title: 'Débat du soir', author_name: 'Le Média' })
      }
      return new Response('', { status: 404 })
    })
    const res = await call('q=d%C3%A9cider&lang=fr')
    expect(res.status).toBe(200)
    const { clips } = (await res.json()) as { clips: { id: string; title: string; channel: string; start: number; text: string; form: string }[] }
    expect(clips).toEqual([
      {
        id: '4Fx-0Wrw0co',
        title: 'Débat du soir',
        channel: 'Le Média',
        start: 182,
        end: 186,
        text: 'Nous allons décider ensemble.',
        form: 'décider',
        auto: false,
      },
    ])
  })

  it('returns the lines of the videos found that hold the word, and caches the answer', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'k')
    stubYouTube()
    const res = await call('q=d%C3%A9cider&lang=fr')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('private, max-age=604800')
    const { clips } = (await res.json()) as { clips: { id: string; start: number; text: string; form: string; auto: boolean }[] }
    expect(clips).toHaveLength(1)
    expect(clips[0]).toMatchObject({ id: 'abc12345678', start: 1, text: 'Il faut décider maintenant.', form: 'décider', auto: false })
  })

  it('skips a video with no captions in the language instead of failing', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'k')
    stubYouTube({ tracks: [{ baseUrl: 'https://yt/timedtext', languageCode: 'en' }] })
    const res = await call('q=d%C3%A9cider&lang=fr')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ clips: [] })
  })

  it('tells a used-up quota from other trouble', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'k')
    stubYouTube({ searchStatus: 403 })
    expect((await call('q=d%C3%A9cider&lang=fr')).status).toBe(429)
    stubYouTube({ searchStatus: 500 })
    expect((await call('q=d%C3%A9cider&lang=fr')).status).toBe(502)
  })
})

describe('/api/youtube still gives subtitles as reading text', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('answers with the text, and says when there are no captions', async () => {
    stubYouTube()
    const ok = await GET_YOUTUBE(new Request('https://x/api/youtube?v=abc12345678&lang=fr', { headers: FROM_APP }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ id: 'abc12345678', title: 'Un jour', channel: 'Chaîne', auto: false, text: expect.stringContaining('décider') })
    stubYouTube({ tracks: [{ baseUrl: 'https://yt/timedtext', languageCode: 'en' }] })
    const none = await GET_YOUTUBE(new Request('https://x/api/youtube?v=abc12345678&lang=fr', { headers: FROM_APP }))
    expect(none.status).toBe(404)
    expect(await none.json()).toMatchObject({ error: 'no captions', available: ['en'] })
  })

  it('brings the lines with their times only when asked (cues=1)', async () => {
    stubYouTube()
    const plain = await (await GET_YOUTUBE(new Request('https://x/api/youtube?v=abc12345678&lang=fr', { headers: FROM_APP }))).json()
    expect(plain.cues).toBeUndefined()
    const timed = await (await GET_YOUTUBE(new Request('https://x/api/youtube?v=abc12345678&lang=fr&cues=1', { headers: FROM_APP }))).json()
    expect(timed.cues.length).toBeGreaterThan(0)
    expect(timed.cues[0]).toEqual({ start: expect.any(Number), end: expect.any(Number), text: expect.any(String) })
  })
})
