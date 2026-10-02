import { allowedArticle } from '../src/engine/news.js'
import { inlineTranscript, parsePodcastFeed, PODCASTS, rfiTranscript, voaEpisode, type Episode } from '../src/engine/podcasts.js'

/** Episodes per request: a week or two of a daily programme. */
const LIMIT = 8
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

async function fetchText(url: string, ms: number): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(ms) })
  if (!res.ok) throw new Error(String(res.status))
  return res.text()
}

/**
 * GET /api/listen?source=<id>: the latest episodes of an allowlisted learner programme with
 * their audio and full text (the browser can't read these pages itself).
 */
export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get('source')
  const source = PODCASTS.find((p) => p.id === id)
  if (!source) return Response.json({ error: 'unknown source' }, { status: 400 })
  try {
    const items = parsePodcastFeed(await fetchText(source.feed, 8000)).slice(0, LIMIT)
    const episodes = await Promise.all(
      items.map(async (item): Promise<Episode> => {
        const { description, ...rest } = item
        if (source.kind === 'inline') return { ...rest, text: inlineTranscript(description) }
        if (!allowedArticle(item.link, source.hosts)) return { ...rest, text: '' }
        try {
          const html = await fetchText(item.link, 7000)
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
      { headers: { 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  } catch {
    return Response.json({ error: 'feed unavailable' }, { status: 502 })
  }
}
