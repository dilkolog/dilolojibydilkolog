import { parseTimedCues } from '../src/engine/clips.js'
import { parseTimedText, youtubeId } from '../src/engine/subtitles.js'
import { CaptionError, fetchCaptions } from './_captions.js'
import { requireApproved } from './_account.js'
import { overLimit, tooMany } from './_rate.js'
import { dailyQuotaReached, overDaily } from './_quota.js'
import { fromApp } from './_origin.js'

/** The most episodes a playlist brings (one page of the Data API: one unit of its daily quota). */
const PLAYLIST_MAX = 50

interface PlaylistItem {
  snippet?: { title?: string; position?: number; resourceId?: { videoId?: string } }
  status?: { privacyStatus?: string }
}

/** A playlist id from a link (…&list=PL…) or the id itself. */
export function playlistId(input: string): string | null {
  const s = input.trim()
  const fromLink = /[?&]list=([\w-]{10,64})/.exec(s)?.[1]
  if (fromLink) return fromLink
  return /^(PL|UU|OL|FL)[\w-]{8,62}$/.test(s) ? s : null
}

/**
 * GET /api/youtube?list=<link or id>: a playlist's videos in order (title and id), with the list's own title, so a
 * course can be added as a series. Each episode's subtitles are fetched only when it is opened. Needs the site's
 * YouTube Data API key; private and deleted videos are left out.
 */
async function playlist(id: string): Promise<Response> {
  const key = process.env.YOUTUBE_API_KEY?.trim() ?? ''
  if (!key) return Response.json({ error: 'no key' }, { status: 501 })
  const api = (path: string, params: Record<string, string>) =>
    fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...params, key })}`, { signal: AbortSignal.timeout(8000) })
  try {
    const [itemsRes, listRes] = await Promise.all([
      api('playlistItems', { part: 'snippet,status', playlistId: id, maxResults: String(PLAYLIST_MAX) }),
      api('playlists', { part: 'snippet', id }),
    ])
    if (itemsRes.status === 404) return Response.json({ error: 'not found' }, { status: 404 })
    if (itemsRes.status === 403) return Response.json({ error: 'quota' }, { status: 429 })
    if (!itemsRes.ok) return Response.json({ error: 'youtube unavailable' }, { status: 502 })
    const items = ((await itemsRes.json()) as { items?: PlaylistItem[] }).items ?? []
    const list = listRes.ok ? ((await listRes.json()) as { items?: { snippet?: { title?: string; channelTitle?: string } }[] }).items?.[0]?.snippet : undefined
    const videos = items
      .filter((i) => i.snippet?.resourceId?.videoId && i.status?.privacyStatus !== 'private' && !/^(Private|Deleted) video$/.test(i.snippet?.title ?? ''))
      .sort((a, b) => (a.snippet?.position ?? 0) - (b.snippet?.position ?? 0))
      .map((i) => ({ id: i.snippet!.resourceId!.videoId!, title: (i.snippet?.title ?? '').slice(0, 160) || 'YouTube' }))
    if (!videos.length) return Response.json({ error: 'not found' }, { status: 404 })
    return Response.json({ id, title: (list?.title ?? '').slice(0, 160) || 'YouTube listesi', channel: list?.channelTitle ?? '', videos }, { headers: { 'cache-control': 'private, max-age=3600' } })
  } catch {
    return Response.json({ error: 'youtube unavailable' }, { status: 502 })
  }
}

/**
 * GET /api/youtube?v=<link or id>&lang=fr: a video's subtitles as reading text (hand-made subtitles in
 * the language first, automatic ones otherwise; see _captions.ts). With `cues=1` the lines come with their
 * times too (to sing along with a song's captions).
 */
export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const denied = await requireApproved(request)
  if (denied) return denied
  // Each call fetches from other sites: a brake per address, and a daily allowance per account.
  if (overLimit(request, 'youtube', 10)) return tooMany()
  if (await overDaily(request, 'youtube')) return dailyQuotaReached()
  const q = new URL(request.url).searchParams
  const list = q.get('list')
  if (list !== null) {
    const pid = playlistId(list)
    return pid ? playlist(pid) : Response.json({ error: 'bad request' }, { status: 400 })
  }
  const id = youtubeId(q.get('v') ?? '')
  const lang = (q.get('lang') ?? '').slice(0, 2)
  if (!id || !/^(en|fr|es)$/.test(lang)) return Response.json({ error: 'bad request' }, { status: 400 })
  try {
    const captions = await fetchCaptions(id, lang)
    const text = parseTimedText(captions.xml)
    if (!text) return Response.json({ error: 'empty captions' }, { status: 502 })
    const cues = q.get('cues') === '1' ? parseTimedCues(captions.xml).map((c) => ({ start: Math.round(c.start * 10) / 10, end: Math.round(c.end * 10) / 10, text: c.text })) : undefined
    return Response.json(
      { id, title: captions.title, channel: captions.channel, auto: captions.auto, text, ...(cues ? { cues } : {}) },
      { headers: { 'cache-control': 'private, max-age=86400' } },
    )
  } catch (e) {
    if (e instanceof CaptionError && e.message === 'no captions') return Response.json({ error: 'no captions', available: e.detail.available }, { status: 404 })
    // YouTube would not give this server the captions (it often treats cloud servers as bots): said as such.
    if (e instanceof CaptionError && e.message === 'youtube blocked') return Response.json({ error: 'youtube blocked', status: e.detail.status }, { status: 502 })
    return Response.json({ error: 'youtube unavailable' }, { status: 502 })
  }
}
