import { requireApproved } from './_account.js'
import { overLimit, tooMany } from './_rate.js'
import { dailyQuotaReached, overDaily } from './_quota.js'
import { fromApp } from './_origin.js'
import { allowedArticle, extractArticle, FEEDS, pageTitle, parseFeed, publicPageUrl, type Article } from '../src/engine/news.js'

/** Articles per request: enough to choose from, few enough to fetch quickly. */
const LIMIT = 8
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

async function fetchText(url: string, ms: number, hosts?: readonly string[]): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(ms) })
  if (!res.ok) throw new Error(String(res.status))
  // An article may redirect inside its own site, never out of it.
  if (hosts && res.url && !allowedArticle(res.url, hosts)) throw new Error('redirected away')
  return res.text()
}

/** The most of a page read (a long article's HTML is well under this). */
const PAGE_BYTES = 3_000_000
/** The most words kept from one page: a long article, not a whole site. */
const PAGE_WORDS = 6000
/** Redirects followed by hand, each one checked like the first address. */
const MAX_REDIRECTS = 4

const pageError = (error: string, status = 400) => Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } })

/** A page's body as text, at most `limit` bytes (more is refused, not cut: a cut page reads badly). */
async function bodyText(res: Response, limit: number): Promise<string | null> {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      void reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const all = new Uint8Array(size)
  let at = 0
  for (const c of chunks) {
    all.set(c, at)
    at += c.byteLength
  }
  const charset = /charset=([\w-]+)/i.exec(res.headers.get('content-type') ?? '')?.[1]
  try {
    return new TextDecoder(charset || 'utf-8').decode(all)
  } catch {
    return new TextDecoder('utf-8').decode(all)
  }
}

/**
 * GET /api/news?url=<https link>: the main text of one web page the learner chose (an article, a blog post),
 * for their own reading library. Only the text comes back (no pictures, no page); nothing is stored here.
 * Only public https pages by name; each redirect is checked again.
 */
async function page(link: string): Promise<Response> {
  let url = publicPageUrl(link)
  if (!url) return pageError('bad url')
  try {
    let res: Response | undefined
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' }, redirect: 'manual', signal: AbortSignal.timeout(8000) })
      if (res.status < 300 || res.status >= 400) break
      const next: URL | null = publicPageUrl(new URL(res.headers.get('location') ?? '', url).href)
      if (!next) return pageError('bad url')
      url = next
      if (hop === MAX_REDIRECTS) return pageError('unavailable', 502)
    }
    if (!res || !res.ok) return pageError('unavailable', 502)
    const type = res.headers.get('content-type') ?? ''
    if (!/text\/html|application\/xhtml/i.test(type)) return pageError('not html', 415)
    const html = await bodyText(res, PAGE_BYTES)
    if (html === null) return pageError('too large', 413)
    const text = extractArticle(html, PAGE_WORDS)
    if (text.split(/\s+/).length < 30) return pageError('no text', 422)
    return Response.json({ title: pageTitle(html), text, url: url.href }, { headers: { 'cache-control': 'private, no-store' } })
  } catch {
    return pageError('unavailable', 502)
  }
}

/**
 * GET /api/news?feed=<id>: the latest articles of an allowlisted news feed with their text,
 * so the app can measure how readable each one is for the learner.
 */
export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const denied = await requireApproved(request)
  if (denied) return denied
  // Each call fetches from other sites: a brake per address, and a daily allowance per account.
  const params = new URL(request.url).searchParams
  const link = params.get('url')
  if (link !== null) {
    // A link that may not be fetched costs neither the brake nor the day's allowance.
    if (!publicPageUrl(link)) return pageError('bad url')
    if (overLimit(request, 'page', 10)) return tooMany()
    if (await overDaily(request, 'page')) return dailyQuotaReached()
    return page(link)
  }
  if (overLimit(request, 'news', 20)) return tooMany()
  if (await overDaily(request, 'news')) return dailyQuotaReached()
  const id = params.get('feed')
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
          text = extractArticle(await fetchText(item.link, 7000, feed.hosts))
        } catch {
          // Unreachable or blocked article: fall back to the feed summary below.
        }
        return { ...item, source: feed.name, text: text || item.description }
      }),
    )
    return Response.json({ articles }, { headers: { 'cache-control': 'private, max-age=1800, stale-while-revalidate=3600' } })
  } catch {
    return Response.json({ error: 'feed unavailable' }, { status: 502 })
  }
}
