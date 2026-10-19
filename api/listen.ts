import { requireApproved } from './_account.js'
import { fromApp } from './_origin.js'
import { allowedArticle } from '../src/engine/news.js'
import { inlineTranscript, parsePodcastFeed, PODCASTS, rfiTranscript, voaEpisode, type Episode } from '../src/engine/podcasts.js'
import { parseSubtitles, parseTimedCues } from '../src/engine/subtitles.js'

/** Episodes per request: a week or two of a daily programme. */
const LIMIT = 8
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

async function fetchText(url: string, ms: number, hosts?: readonly string[]): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(ms) })
  if (!res.ok) throw new Error(String(res.status))
  // A page may redirect inside its own site, never out of it (the same rule as the news articles).
  if (hosts && res.url && !allowedArticle(res.url, hosts)) throw new Error('redirected away')
  return res.text()
}

/**
 * GET /api/listen?source=<id>: the latest episodes of an allowlisted learner programme with
 * their audio and full text (the browser can't read these pages itself).
 */
export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const denied = await requireApproved(request)
  if (denied) return denied
  const id = new URL(request.url).searchParams.get('source')
  const source = PODCASTS.find((p) => p.id === id)
  if (!source) return Response.json({ error: 'unknown source' }, { status: 400 })
  try {
    const items = parsePodcastFeed(await fetchText(source.feed, 8000)).slice(0, LIMIT)
    const episodes = await Promise.all(
      items.map(async (item): Promise<Episode> => {
        const { description, transcriptUrl, ...rest } = item
        if (source.kind === 'inline') return { ...rest, text: inlineTranscript(description) }
        if (source.kind === 'transcript' && transcriptUrl) {
          if (!allowedArticle(transcriptUrl, source.hosts)) return { ...rest, text: '' }
          try {
            const raw = await fetchText(transcriptUrl, 7000, source.hosts)
            const timed = transcriptUrl.endsWith('.vtt') || transcriptUrl.endsWith('.srt') || raw.startsWith('WEBVTT')
            // Timed subtitles also go out as cues, so the app can follow the audio sentence by sentence.
            return timed ? { ...rest, text: parseSubtitles(raw), cues: parseTimedCues(raw) } : { ...rest, text: raw }
          } catch {
            return { ...rest, text: '' }
          }
        }
        if (!allowedArticle(item.link, source.hosts)) return { ...rest, text: '' }
        try {
          const html = await fetchText(item.link, 7000, source.hosts)
          if (source.kind === 'rfi') return { ...rest, text: rfiTranscript(html) }
          const voa = voaEpisode(html)
          return { ...rest, audio: rest.audio ?? voa.audio, text: voa.text }
        } catch {
          return { ...rest, text: '' }
        }
      }),
    )
    return Response.json(
      { episodes: episodes.filter((e) => e.audio && e.text.split(/\s+/).length >= 60) },
      { headers: { 'cache-control': 'private, max-age=3600, stale-while-revalidate=86400' } },
    )
  } catch {
    return Response.json({ error: 'feed unavailable' }, { status: 502 })
  }
}
