import { findClips, parseInnertubeSearch, parseTimedCues, parseYouglishClips, type Clip } from '../src/engine/clips.js'
import type { TargetLanguage } from '../src/engine/types.js'
import { fetchCaptions } from './_captions.js'
import { requireApproved } from './_account.js'
import { fromApp } from './_origin.js'

/** Videos looked into per search, and clips handed back. */
const VIDEOS = 6
const CLIPS = 12
/** At most this many clips from one video, so one talker does not fill the list. */
const PER_VIDEO = 2

const YG_LANG: Record<TargetLanguage, string> = { en: 'english', fr: 'french', es: 'spanish' }
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

interface SearchItem {
  id?: { videoId?: string }
  snippet?: { title?: string; channelTitle?: string }
}

async function fetchOembedMeta(id: string): Promise<{ title: string; channel: string }> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return { title: 'YouTube', channel: '' }
    const data = (await res.json()) as { title?: string; author_name?: string }
    return { title: data.title?.trim() || 'YouTube', channel: data.author_name?.trim() || '' }
  } catch {
    return { title: 'YouTube', channel: '' }
  }
}

async function fetchYouglishClips(word: string, lang: TargetLanguage): Promise<{ ok: boolean; clips: Clip[] }> {
  try {
    const res = await fetch(`https://youglish.com/pronounce/${encodeURIComponent(word)}/${YG_LANG[lang]}`, {
      headers: { 'user-agent': BROWSER_UA, 'accept-language': `${lang},en;q=0.8` },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return { ok: false, clips: [] }
    const html = await res.text()
    if (!html.includes('params.jsonData')) return { ok: false, clips: [] }
    const hits = parseYouglishClips(html, word, lang, CLIPS, PER_VIDEO)
    if (!hits.length) return { ok: true, clips: [] }
    const uniqueIds = [...new Set(hits.map((h) => h.id))]
    const metas = new Map(await Promise.all(uniqueIds.map(async (id) => [id, await fetchOembedMeta(id)] as const)))
    return {
      ok: true,
      clips: hits.map((h) => {
        const meta = metas.get(h.id) ?? { title: 'YouTube', channel: '' }
        return { ...h, title: meta.title, channel: meta.channel, auto: false }
      }),
    }
  } catch {
    return { ok: false, clips: [] }
  }
}

async function searchInnertube(word: string, lang: TargetLanguage): Promise<{ id: string; title: string; channel: string }[]> {
  try {
    const gl = lang === 'fr' ? 'FR' : lang === 'es' ? 'ES' : 'US'
    const doSearch = async (q: string) => {
      const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          context: { client: { clientName: 'WEB', clientVersion: '2.20250101.00.00', hl: lang, gl } },
          query: q,
          params: 'EgIoAQ==',
        }),
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return []
      return parseInnertubeSearch(await res.json(), VIDEOS)
    }
    const withQuotes = await doSearch(`"${word}"`)
    if (withQuotes.length > 0) return withQuotes
    return await doSearch(word)
  } catch {
    return []
  }
}

/**
 * GET /api/clips?q=<word>&lang=fr: where the word is spoken in YouTube videos.
 * First queries YouGlish's curated subtitle index (+ YouTube oEmbed for video titles/channels), which needs
 * no API key or quota; falls back to YouTube search + caption tracks when needed.
 */
export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const denied = await requireApproved(request)
  if (denied) return denied
  const q = new URL(request.url).searchParams
  const word = (q.get('q') ?? '').trim()
  const lang = (q.get('lang') ?? '').slice(0, 2)
  if (!word || word.length > 40 || !/^(en|fr|es)$/.test(lang)) return Response.json({ error: 'bad request' }, { status: 400 })
  const targetLang = lang as TargetLanguage
  const key = process.env.YOUTUBE_API_KEY?.trim() ?? ''

  const yg = await fetchYouglishClips(word, targetLang)
  if (yg.clips.length > 0) {
    return Response.json({ clips: yg.clips.slice(0, CLIPS) }, { headers: { 'cache-control': 'private, max-age=604800' } })
  }

  if (!key && !yg.ok) return Response.json({ error: 'no key' }, { status: 501 })

  try {
    let videos: { id: string; title: string; channel: string }[] = []
    if (key) {
      const search = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        videoCaption: 'closedCaption',
        videoEmbeddable: 'true',
        relevanceLanguage: lang,
        maxResults: String(VIDEOS),
        q: `"${word}"`,
        key,
      })
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${search}`, { signal: AbortSignal.timeout(6000) })
      if (res.status === 403) return Response.json({ error: 'quota' }, { status: 429 })
      if (res.status === 400) {
        // Invalid or placeholder YOUTUBE_API_KEY: fall back to key-free Innertube search.
        videos = await searchInnertube(word, targetLang)
      } else if (!res.ok) {
        return Response.json({ error: 'youtube unavailable' }, { status: 502 })
      } else {
        videos = ((await res.json()) as { items?: SearchItem[] }).items?.flatMap((i) => (i.id?.videoId ? [{ id: i.id.videoId, title: i.snippet?.title ?? 'YouTube', channel: i.snippet?.channelTitle ?? '' }] : [])) ?? []
      }
    } else {
      videos = await searchInnertube(word, targetLang)
    }

    const found = await Promise.all(
      videos.map(async (v): Promise<Clip[]> => {
        try {
          const captions = await fetchCaptions(v.id, lang)
          return findClips(parseTimedCues(captions.xml), word, targetLang, { ...v, auto: captions.auto }, PER_VIDEO)
        } catch {
          return []
        }
      }),
    )
    const clips = found.flat().slice(0, CLIPS)
    return Response.json(
      { clips },
      { headers: { 'cache-control': clips.length > 0 ? 'private, max-age=604800' : 'private, no-store' } },
    )
  } catch {
    return Response.json({ error: 'youtube unavailable' }, { status: 502 })
  }
}

