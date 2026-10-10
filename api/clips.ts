import { findClips, parseTimedCues, type Clip } from '../src/engine/clips.js'
import { CaptionError, fetchCaptions } from './_captions.js'
import { requireApproved } from './_account.js'
import { fromApp } from './_origin.js'

/** Videos looked into per search, and clips handed back. */
const VIDEOS = 10
const CLIPS = 12
/** At most this many clips from one video, so one talker does not fill the list. */
const PER_VIDEO = 2

interface SearchItem {
  id?: { videoId?: string }
  snippet?: { title?: string; channelTitle?: string }
}

/**
 * GET /api/clips?q=<word>&lang=fr: where the word is spoken in YouTube videos. The official search finds
 * videos with captions in the language that mention the word; their captions are read and the lines with the
 * word (in any form) come back with their times, so the browser can start the video there.
 *
 * Needs a YouTube Data API key in the YOUTUBE_API_KEY environment variable (free; a search costs 100 of the
 * 10 000 units a day), see docs/YOUTUBE.md. Answers are cached for a week: the same word is free the next time.
 */
export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const denied = await requireApproved(request)
  if (denied) return denied
  const q = new URL(request.url).searchParams
  const word = (q.get('q') ?? '').trim()
  const lang = (q.get('lang') ?? '').slice(0, 2)
  if (!word || word.length > 40 || !/^(en|fr|es)$/.test(lang)) return Response.json({ error: 'bad request' }, { status: 400 })
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return Response.json({ error: 'no key' }, { status: 501 })
  try {
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
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${search}`, { signal: AbortSignal.timeout(8000) })
    if (res.status === 403) return Response.json({ error: 'quota' }, { status: 429 })
    if (!res.ok) return Response.json({ error: 'youtube unavailable' }, { status: 502 })
    const videos = ((await res.json()) as { items?: SearchItem[] }).items?.flatMap((i) => (i.id?.videoId ? [{ id: i.id.videoId, title: i.snippet?.title ?? 'YouTube', channel: i.snippet?.channelTitle ?? '' }] : [])) ?? []
    const found = await Promise.all(
      videos.map(async (v): Promise<Clip[]> => {
        try {
          const captions = await fetchCaptions(v.id, lang)
          return findClips(parseTimedCues(captions.xml), word, lang as 'en' | 'fr' | 'es', { ...v, auto: captions.auto }, PER_VIDEO)
        } catch (e) {
          if (e instanceof CaptionError) return []
          throw e
        }
      }),
    )
    return Response.json({ clips: found.flat().slice(0, CLIPS) }, { headers: { 'cache-control': 'public, s-maxage=604800' } })
  } catch {
    return Response.json({ error: 'youtube unavailable' }, { status: 502 })
  }
}
