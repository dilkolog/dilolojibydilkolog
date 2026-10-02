import { decodeEntities, extractArticle } from './news.js'
import type { TargetLanguage } from './types.js'

/**
 * Listening library: short audio programmes for learners that come with their full text, so you
 * can listen first and then read what you heard, with the coverage meter of reading mode.
 */
export interface Podcast {
  id: string
  language: TargetLanguage
  name: string
  feed: string
  /** Where the text lives: the item's web page (VOA article, RFI transcript) or the feed itself. */
  kind: 'voa' | 'rfi' | 'inline'
  hosts: string[]
}

export const PODCASTS: Podcast[] = [
  { id: 'voa-asitis', language: 'en', name: 'VOA Learning English · As It Is', feed: 'https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi', kind: 'voa', hosts: ['learningenglish.voanews.com'] },
  { id: 'voa-stories', language: 'en', name: 'VOA Learning English · American Stories', feed: 'https://learningenglish.voanews.com/api/zyg__l-vomx-tpetmty', kind: 'voa', hosts: ['learningenglish.voanews.com'] },
  { id: 'voa-science', language: 'en', name: 'VOA Learning English · Science & Technology', feed: 'https://learningenglish.voanews.com/api/zmg_pl-vomx-tpeymtm', kind: 'voa', hosts: ['learningenglish.voanews.com'] },
  {
    id: 'rfi-jff',
    language: 'fr',
    name: 'RFI · Journal en français facile',
    feed: 'https://apis.fle.rfi.fr/products/get_product/fle_getpodcast_by_nid_author_rfi?token_application=applepodcast_fle&program.entrepriseId=WBMZ39-FLE-FR-20220627',
    kind: 'rfi',
    hosts: ['francaisfacile.rfi.fr'],
  },
  { id: 'es-facil', language: 'es', name: 'Noticias en español fácil', feed: 'https://www.harmsen.nl/podcast.xml', kind: 'inline', hosts: [] },
]

export interface Episode {
  title: string
  date: string
  link: string
  audio?: string
  text: string
}

const tag = (item: string, name: string) => item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1]
const cdata = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')

/**
 * Tracking redirects in front of the audio (op3.dev, audiomeans) are dropped: the direct file
 * is the same and the listener isn't counted by third parties.
 */
export function directAudio(url: string): string {
  return url.replace(/^https?:\/\/op3\.dev\/e\/(?:https?:\/\/)?/, 'https://').replace(/^https?:\/\/audio\.audiomeans\.fr\/pfx\/[^/]+\//, 'https://').replace(/[?&](guid|source)=[^&]*/g, '').replace(/\?$/, '')
}

const unescapeOnce = (s: string) => (/&lt;(?:!\[CDATA\[|[a-z/])/i.test(s) ? decodeEntities(s) : s)

/** Items of a podcast feed: title, date, page, audio file and description HTML. */
export function parsePodcastFeed(xml: string): (Omit<Episode, 'text'> & { description: string })[] {
  return xml
    .split('<item>')
    .slice(1)
    .map((item) => {
      const enclosure = item.match(/<enclosure[^>]*>/)?.[0] ?? ''
      const url = enclosure.match(/url="([^"]+)"/)?.[1]
      const isAudio = /audio\//.test(enclosure) || /\.mp3/.test(url ?? '')
      return {
        title: decodeEntities(cdata(tag(item, 'title') ?? '')).trim(),
        date: (tag(item, 'pubDate') ?? '').trim(),
        link: decodeEntities(cdata(tag(item, 'link') ?? '')).trim(),
        audio: url && isAudio ? directAudio(decodeEntities(url)) : undefined,
        // Some feeds escape the HTML once more (&lt;ul&gt;): unescape before reading it.
        description: cdata(unescapeOnce(tag(item, 'description') ?? '')),
      }
    })
}

const paragraphs = (htmlPart: string) =>
  [...htmlPart.matchAll(/<(p|li|h\d)[^>]*>([\s\S]*?)<\/\1>/g)]
    .map((m) => decodeEntities(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
    .filter(Boolean)

/** The feed's own transcript (topic list at the top left out: it repeats the headings). */
export function inlineTranscript(description: string): string {
  return paragraphs(description.replace(/<ul>[\s\S]*?<\/ul>/, '')).join('\n\n')
}

/** RFI episode page: the synchronised transcription block. */
export function rfiTranscript(html: string): string {
  const start = html.indexOf('m-transcription__content')
  if (start < 0) return ''
  const end = html.indexOf('m-transcription__load', start)
  return paragraphs(html.slice(start, end > start ? end : start + 80_000)).join('\n\n')
}

/** VOA article page: the MP3 (standard quality) and the article text. */
export function voaEpisode(html: string): { audio?: string; text: string } {
  const audio = html.match(/https:\/\/voa-audio\.voanews\.eu\/[^"'&?\s]+?(?<!_hq)\.mp3/)?.[0]
  return { audio, text: extractArticle(html, 3000) }
}
