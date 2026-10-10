import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET as NEWS } from '../../api/news'
import { GET as LISTEN } from '../../api/listen'

// The owner's approval is tested in access.test.ts; here the account check always passes.
vi.mock('../../api/_account', async (original) => ({ ...(await original<typeof import('../../api/_account')>()), requireApproved: async () => null }))

const FROM_APP = { 'sec-fetch-site': 'same-origin' }
const item = (link: string, title = 'Titre') => `<item><title>${title}</title><link>${link}</link><description>Résumé du flux.</description></item>`
const rss = (...items: string[]) => `<rss><channel>${items.join('')}</channel></rss>`

/** Answers fetches from a table; records every URL asked for. */
function stub(pages: Record<string, string | number>) {
  const asked: string[] = []
  vi.stubGlobal('fetch', async (url: string) => {
    asked.push(url)
    const page = pages[url]
    if (page === undefined) throw new Error(`unexpected fetch ${url}`)
    return typeof page === 'number' ? new Response('', { status: page }) : new Response(page)
  })
  return asked
}

afterEach(() => vi.unstubAllGlobals())

describe('/api/news', () => {
  const call = (feed: string) => NEWS(new Request(`https://app.test/api/news?feed=${feed}`, { headers: FROM_APP }))

  it('serves only feeds on its list', async () => {
    const asked = stub({})
    expect((await call('https%3A%2F%2Fevil.example%2Frss')).status).toBe(400)
    expect((await call('')).status).toBe(400)
    expect(asked).toEqual([])
  })

  it('never fetches a link outside the feed’s own site, and falls back to the summary', async () => {
    const asked = stub({
      'https://www.lemonde.fr/rss/une.xml': rss(item('https://www.lemonde.fr/a.html', 'Un'), item('https://evil.example/b', 'Deux'), item('http://www.lemonde.fr/c.html', 'Trois'), item('https://www.lemonde.fr/d.html', 'Quatre')),
      'https://www.lemonde.fr/a.html': '<html><body><article><p>Texte complet de l’article, assez long pour être gardé comme texte.</p></article></body></html>',
      'https://www.lemonde.fr/d.html': 500,
    })
    const res = await call('lemonde')
    expect(res.status).toBe(200)
    const { articles } = (await res.json()) as { articles: { title: string; text: string; source: string }[] }
    expect(articles.map((a) => a.title)).toEqual(['Un', 'Quatre'])
    expect(articles[1].text).toBe('Résumé du flux.')
    expect(articles.every((a) => a.source === 'Le Monde')).toBe(true)
    expect(asked.some((u) => u.includes('evil.example') || u.startsWith('http:'))).toBe(false)
    expect(res.headers.get('cache-control')).toContain('s-maxage')
  })

  it('passes the recording of a bulletin along with its text', async () => {
    stub({
      'https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi': rss(
        '<item><title>As It Is</title><link>https://learningenglish.voanews.com/a/1.html</link><description>Summary.</description><enclosure url="https://voa-audio.voanews.eu/a1.mp3" type="audio/mpeg"/></item>',
      ),
      'https://learningenglish.voanews.com/a/1.html': '<html><article><p>The full bulletin text of the day, long enough to be kept as the article text here.</p></article></html>',
    })
    const { articles } = (await (await call('voa-learning')).json()) as { articles: { audio?: string; text: string }[] }
    expect(articles[0].audio).toBe('https://voa-audio.voanews.eu/a1.mp3')
    expect(articles[0].text).toContain('full bulletin text')
  })

  it('says 502 when the feed itself is down', async () => {
    stub({ 'https://www.lemonde.fr/rss/une.xml': 503 })
    expect((await call('lemonde')).status).toBe(502)
  })
})

describe('/api/listen', () => {
  const call = (source: string) => LISTEN(new Request(`https://app.test/api/listen?source=${source}`, { headers: FROM_APP }))

  it('serves only programmes on its list, and 502s when the feed is down', async () => {
    const asked = stub({ 'https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi': 500 })
    expect((await call('anything')).status).toBe(400)
    expect(asked).toEqual([])
    expect((await call('voa-asitis')).status).toBe(502)
  })

  it('never fetches an episode page outside the programme’s site', async () => {
    const episode = (link: string) => `<item><title>Ep</title><link>${link}</link><enclosure url="https://learningenglish.voanews.com/ep.mp3" type="audio/mpeg"/><description>d</description></item>`
    const asked = stub({ 'https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi': rss(episode('https://evil.example/ep')) })
    const res = await call('voa-asitis')
    expect(res.status).toBe(200)
    // Too short to read along with, so nothing comes back; the point is what was not fetched.
    expect(await res.json()).toEqual({ episodes: [] })
    expect(asked).toEqual(['https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi'])
  })
})
