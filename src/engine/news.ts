import type { TargetLanguage } from './types'

/** News feeds the server may fetch: an allowlist, so the endpoint can't be used as an open proxy. */
export const FEEDS: { id: string; language: TargetLanguage; name: string; url: string; hosts: string[]; /** The feed still writes http:// for sites that answer on https: its links and recordings are upgraded. */ upgradeHttp?: boolean }[] = [
  // Bulletins made for learners, with their recording: read and listen (VOA is public domain; RFI streams its podcast).
  { id: 'rfi-facile', language: 'fr', name: 'RFI · Journal en français facile', url: 'https://francaisfacile.rfi.fr/fr/podcasts/journal-en-fran%C3%A7ais-facile/podcast', hosts: ['rfi.fr'] },
  { id: 'voa-learning', language: 'en', name: 'VOA Learning English · As It Is', url: 'https://learningenglish.voanews.com/podcast/?zoneId=3521', hosts: ['learningenglish.voanews.com'] },
  { id: 'voa-es-news', language: 'es', name: 'Voz de América · Noticias', url: 'https://www.vozdeamerica.com/api/zgkmqrl-vomx-tpe-pvqo', hosts: ['vozdeamerica.com'] },
  { id: 'voa-es', language: 'es', name: 'Voz de América · Buenos días América (sesli)', url: 'https://www.vozdeamerica.com/podcast/?zoneId=537', hosts: ['vozdeamerica.com'] },
  { id: 'salut-linfo', language: 'fr', name: "franceinfo · Salut l'info ! (enfants, A2–B1)", url: 'https://radiofrance-podcast.net/podcast09/podcast_9f5486b0-38b5-4544-bf49-e24b18bd022c.xml', hosts: ['radiofrance.fr', 'franceinfo.fr'] },
  { id: 'hoyhablamos', language: 'es', name: 'Hoy Hablamos · Noticias en español (B1–B2)', url: 'https://www.hoyhablamos.com/feed/podcast/', hosts: ['hoyhablamos.com'] },
  { id: 'bbc-6min', language: 'en', name: 'BBC Learning English · 6 Minute English', url: 'https://podcasts.files.bbci.co.uk/p02pc9tn.rss', hosts: ['bbc.co.uk', 'bbc.com'], upgradeHttp: true },
  { id: 'lemonde', language: 'fr', name: 'Le Monde', url: 'https://www.lemonde.fr/rss/une.xml', hosts: ['lemonde.fr'] },
  { id: 'france24', language: 'fr', name: 'France 24', url: 'https://www.france24.com/fr/rss', hosts: ['france24.com'] },
  { id: 'rfi', language: 'fr', name: 'RFI', url: 'https://www.rfi.fr/fr/rss', hosts: ['rfi.fr'] },
  { id: '20minutes', language: 'fr', name: '20 minutes', url: 'https://www.20minutes.fr/feeds/rss-une.xml', hosts: ['20minutes.fr'] },
  { id: 'elpais', language: 'es', name: 'El País', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', hosts: ['elpais.com'] },
  { id: 'bbcmundo', language: 'es', name: 'BBC Mundo', url: 'https://feeds.bbci.co.uk/mundo/rss.xml', hosts: ['bbc.com', 'bbc.co.uk'] },
  { id: '20minutos', language: 'es', name: '20minutos', url: 'https://www.20minutos.es/rss/', hosts: ['20minutos.es'] },
  { id: 'bbc', language: 'en', name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', hosts: ['bbc.com', 'bbc.co.uk'] },
  { id: 'guardian', language: 'en', name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', hosts: ['theguardian.com'] },
  { id: 'npr', language: 'en', name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml', hosts: ['npr.org'] },
]

export interface FeedItem {
  title: string
  link: string
  description: string
  /** The recording of the item (an RSS enclosure), when the feed has one. */
  audio?: string
}

export interface Article extends FeedItem {
  source: string
  /** Article text as paragraphs separated by blank lines; may be partial (paywalls). */
  text: string
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', sbquo: '‚', bdquo: '„', hellip: '…', laquo: '«', raquo: '»',
  ndash: '–', mdash: '—', middot: '·', bull: '•', euro: '€', pound: '£', copy: '©', reg: '®', deg: '°', iexcl: '¡', iquest: '¿', szlig: 'ß', oelig: 'œ', OElig: 'Œ', aelig: 'æ', AElig: 'Æ',
}
// Accented letters come in pairs (eacute/Eacute…): both cases from the lower-case letters.
const LETTERS: Record<string, string> = { agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å', egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë', igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï', ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö', ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü', ccedil: 'ç', ntilde: 'ñ', yacute: 'ý' }
for (const [name, ch] of Object.entries(LETTERS)) {
  ENTITIES[name] = ch
  ENTITIES[name[0].toUpperCase() + name.slice(1)] = ch.toUpperCase()
}
ENTITIES.yuml = 'ÿ'

export function decodeEntities(s: string): string {
  // One pass, so "&#38;lt;" stays "&lt;"; a number that is no character (NUL, a surrogate, past U+10FFFF) is left as written.
  return s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (m, hex?: string, dec?: string, name?: string) => {
    if (name) return Object.hasOwn(ENTITIES, name) ? ENTITIES[name] : Object.hasOwn(ENTITIES, name.toLowerCase()) ? ENTITIES[name.toLowerCase()] : m
    const cp = hex ? parseInt(hex, 16) : Number(dec)
    return cp > 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : m
  })
}

const stripTags = (s: string) => decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

const tag = (block: string, name: string) => {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(block)
  return m ? stripTags(m[1]) : ''
}

/** Items of an RSS 2.0 or Atom feed (`upgradeHttp`: for a feed that writes http:// where https works). */
export function parseFeed(xml: string, options: { upgradeHttp?: boolean } = {}): FeedItem[] {
  const up = (url: string) => (options.upgradeHttp ? url.replace(/^http:\/\//i, 'https://') : url)
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? []
  return blocks
    .map((b) => {
      const atomLink = /<link[^>]*href="([^"]+)"/i.exec(b)?.[1]
      const audio = up(/<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*>/i.exec(b)?.[1] ?? '')
      const audioHttps = /^https:\/\//.test(audio) ? audio : undefined
      const enclosureIsAudio = audioHttps ? !/\btype=["'](?!audio\/)/i.test(/<enclosure\b[^>]*>/i.exec(b)![0]) : false
      return {
        title: tag(b, 'title'),
        link: up((tag(b, 'link') || atomLink || '').trim()),
        description: tag(b, 'description') || tag(b, 'summary'),
        ...(audioHttps && enclosureIsAudio ? { audio: decodeEntities(audioHttps) } : {}),
      }
    })
    .filter((i) => i.title && /^https:\/\//.test(i.link))
}

/**
 * The readable text of an article page: paragraphs inside <article> (or the whole page when
 * there is none), without scripts, menus or captions; short fragments are dropped.
 */
export function extractArticle(html: string, maxWords = 1500): string {
  const clean = html.replace(/<(script|style|noscript|nav|header|footer|aside|figure|form)[\s\S]*?<\/\1>/gi, ' ')
  const paragraphsOf = (scope: string) => (scope.match(/<p[\s>][\s\S]*?<\/p>/gi) ?? []).map(stripTags).filter((p) => p.length >= 60)
  const article = /<article[\s\S]*?<\/article>/i.exec(clean)?.[0]
  let paragraphs = article ? paragraphsOf(article) : paragraphsOf(clean)
  // Some sites put only a teaser inside <article>: then the whole page is a better source.
  if (article && paragraphs.join(' ').split(/\s+/).length < 120) {
    const whole = paragraphsOf(clean)
    if (whole.length > paragraphs.length) paragraphs = whole
  }
  const out: string[] = []
  let words = 0
  for (const p of paragraphs) {
    if (words >= maxWords) break
    out.push(p)
    words += p.split(/\s+/).length
  }
  return out.join('\n\n')
}

/** True when `link` points into one of the feed's own sites (articles are only fetched there). */
export function allowedArticle(link: string, hosts: readonly string[]): boolean {
  try {
    const u = new URL(link)
    return u.protocol === 'https:' && hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))
  } catch {
    return false
  }
}
