import type { TargetLanguage } from '../engine/types'

/**
 * Reading material from Wikipedia (CC BY-SA): search a topic in the language's Wikipedia (Simple
 * English for English, written for learners), then read the article as plain text. No key; the
 * API answers the browser directly (origin=*).
 */
export type WikiSite = TargetLanguage | 'simple'

const api = (site: WikiSite) => `https://${site}.wikipedia.org/w/api.php`

export interface WikiResult {
  title: string
  /** The opening paragraphs, for a first look and to estimate how much of it the learner knows. */
  intro: string
}

async function call(site: WikiSite, params: Record<string, string>) {
  const q = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })
  const res = await fetch(`${api(site)}?${q}`)
  if (!res.ok) throw new Error(`Wikipedia yanıt vermedi (${res.status}).`)
  return res.json()
}

/** Articles about a topic (or random ones without a query), with their introductions. */
export async function searchWikipedia(query: string, site: WikiSite, limit = 8): Promise<WikiResult[]> {
  const gen: Record<string, string> = query.trim()
    ? { generator: 'search', gsrsearch: query.trim(), gsrlimit: String(limit), gsrnamespace: '0' }
    : { generator: 'random', grnlimit: String(limit), grnnamespace: '0' }
  const j = (await call(site, { action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exlimit: 'max', ...gen })) as {
    query?: { pages?: { title: string; index?: number; extract?: string }[] }
  }
  return (j.query?.pages ?? [])
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((p) => ({ title: p.title, intro: (p.extract ?? '').trim() }))
    .filter((p) => p.intro.split(/\s+/).length >= 15)
}

/** Sections that are lists of sources and links, not reading. */
const BACK_MATTER = /^(r[ée]f[ée]rences?|notes?( et r[ée]f[ée]rences)?|voir aussi|bibliographie|liens externes|articles connexes|sources?|referencias|v[ée]ase tambi[ée]n|enlaces externos|bibliograf[ií]a|notas|see also|external links|further reading|bibliography|other websites)$/i

/** Plain text of an article without its back matter, cut at a paragraph near `maxChars`. */
export function cleanArticle(text: string, maxChars = 6000): string {
  const out: string[] = []
  let size = 0
  // Extracts put each paragraph and each "== Heading ==" on its own line.
  for (const line of text.split('\n')) {
    const heading = line.trim().match(/^=+\s*(.+?)\s*=+$/)
    if (heading) {
      if (BACK_MATTER.test(heading[1])) break
      continue
    }
    const para = line.replace(/\s+/g, ' ').trim()
    if (!para) continue
    if (size && size + para.length > maxChars) break
    out.push(para)
    size += para.length
  }
  return out.join('\n\n')
}

export async function fetchArticle(title: string, site: WikiSite): Promise<string> {
  const j = (await call(site, { action: 'query', prop: 'extracts', explaintext: '1', exsectionformat: 'wiki', titles: title, redirects: '1' })) as {
    query?: { pages?: { extract?: string }[] }
  }
  const text = j.query?.pages?.[0]?.extract ?? ''
  if (!text.trim()) throw new Error('Makale okunamadı.')
  return cleanArticle(text)
}
