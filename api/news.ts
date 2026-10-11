import { requireApproved } from './_account.js'
import { fromApp } from './_origin.js'
import { allowedArticle, extractArticle, FEEDS, parseFeed, type Article } from '../src/engine/news.js'

/** Articles per request: enough to choose from, few enough to fetch quickly. */
const LIMIT = 8
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

async function fetchText(url: string, ms: number): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(ms) })
  if (!res.ok) throw new Error(String(res.status))
  return res.text()
}

/**
 * GET /api/news?feed=<id>: the latest articles of an allowlisted news feed with their text,
 * so the app can measure how readable each one is for the learner.
 */
export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const denied = await requireApproved(request)
  if (denied) return denied
  const id = new URL(request.url).searchParams.get('feed')
  const feed = FEEDS.find((f) => f.id === id)
  if (!feed) return Response.json({ error: 'unknown feed' }, { status: 400 })
  try {
    const items = parseFeed(await fetchText(feed.url, 8000), { upgradeHttp: feed.upgradeHttp })
      .filter((i) => allowedArticle(i.link, feed.hosts))
      .slice(0, LIMIT)
    const articles = await Promise.all(
      items.map(async (item): Promise<Article> => {
        let text = ''
        try {
          text = extractArticle(await fetchText(item.link, 7000))
        } catch {
          // Unreachable or blocked article: fall back to the feed summary below.
        }
        return { ...item, source: feed.name, text: text || item.description }
      }),
    )
    return Response.json({ articles }, { headers: { 'cache-control': 'public, s-maxage=1800, stale-while-revalidate=3600' } })
  } catch {
    return Response.json({ error: 'feed unavailable' }, { status: 502 })
  }
}
