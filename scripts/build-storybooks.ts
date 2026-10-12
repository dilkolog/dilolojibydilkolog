/**
 * Builds the easy illustrated stories (src/data/storybooks/{fr,es}.json) from Global Storybooks
 * (https://globalstorybooks.net, UBC; CC BY): the stories listed in docs/kaynaklar/storybooks.json
 * with a recording. Each story's page gives its text page by page, the whole story read aloud, its
 * credits and licence; the same story's Turkish page, when there is one, gives each page's Turkish.
 * Only CC BY licences are kept (not NC). Pages are fetched one at a time.
 *
 * Usage: npx tsx scripts/build-storybooks.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'

interface Listed {
  title: string
  language: 'fr' | 'es'
  url: string
  audioUrl: string | null
}

export interface Storybook {
  id: string
  language: 'fr' | 'es'
  title: string
  /** Global Storybooks level, 1 (a word a page) to 5. */
  level: number
  words: number
  url: string
  audio: string
  credit: { writer?: string; illustrator?: string; translator?: string; reader?: string }
  license: { name: string; url: string }
  pages: string[]
  /** Each page's illustration (same licence). */
  images: string[]
  /** Each page in Turkish, when the story has a Turkish version with the same pages. */
  turkish?: string[]
}

const ROLES: Record<string, keyof Storybook['credit']> = {
  'Écrit par': 'writer',
  Texto: 'writer',
  'Illustré par': 'illustrator',
  Ilustraciones: 'illustrator',
  'Traduit par': 'translator',
  'Translated by': 'translator',
  Traducción: 'translator',
  'Lu par': 'reader',
  'Lectura en voz alta': 'reader',
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()

/** The page texts and pictures by page number ("02" → text). */
function pages(html: string): Map<string, { text: string; image?: string }> {
  const out = new Map<string, { text: string; image?: string }>()
  for (const m of html.matchAll(/<div id="text(\d+)" class="columns">([\s\S]*?)(?=<div id="text\d+" class="columns">|<div class="colophon|$)/g)) {
    const def = m[2].match(/class="[^"]*\bdef\b[^"]*"><h3>([\s\S]*?)<\/h3>/)
    const text = def ? decode(def[1]) : ''
    const image = m[2].match(/<img class="img-responsive" src="([^"]+)"/)?.[1]
    if (text) out.set(m[1], { text, ...(image ? { image } : {}) })
  }
  return out
}

async function get(url: string): Promise<string | null> {
  const res = await fetch(url).catch(() => null)
  return res?.ok ? res.text() : null
}

const listed = (JSON.parse(readFileSync('docs/kaynaklar/storybooks.json', 'utf8')) as Listed[]).filter((s) => s.audioUrl && s.url.includes('global-asp.github.io'))
const out: Record<'fr' | 'es', Storybook[]> = { fr: [], es: [] }
for (const s of listed) {
  const html = await get(s.url)
  if (!html) {
    console.warn('missing', s.url)
    continue
  }
  const license = html.match(/rel="license" href="([^"]+)"[^>]*>(?!<img)([^<]+)</)
  if (!license || !/\/licenses\/by\//.test(license[1])) {
    console.warn('not CC BY, left out:', s.url, license?.[1])
    continue
  }
  const id = s.url.match(/\/(\d{4})\/?$/)![1]
  const credit: Storybook['credit'] = {}
  for (const m of html.matchAll(/data-tooltip="([^"]+)"><img[^>]*><\/span>\s*([^<]+)<\/h3>/g)) {
    const role = ROLES[m[1]]
    if (role && !credit[role]) credit[role] = decode(m[2])
  }
  const audio = html.match(/<audio id="audioplayer"[^>]*><source src="([^"]+)"/)?.[1]
  const level = Number(html.match(/\/level(\d)"/)?.[1] ?? 0)
  const own = pages(html)
  const ordered = [...own.keys()].sort()
  // The title page (01) is the title; the story is the rest.
  const body = ordered.filter((k) => k !== '01')
  const text = body.map((k) => own.get(k)!.text)
  const images = body.map((k) => own.get(k)!.image ?? '')
  if (!audio || !text.length) {
    console.warn('no audio or text:', s.url)
    continue
  }
  const trHtml = await get(s.url.replace(/\/stories\/(fr|es)\//, '/stories/tr/'))
  const tr = trHtml ? pages(trHtml) : new Map<string, { text: string; image?: string }>()
  const turkish = body.every((k) => tr.has(k)) ? body.map((k) => tr.get(k)!.text) : undefined
  out[s.language].push({
    id: `gsb-${s.language}-${id}`,
    language: s.language,
    title: own.get('01')?.text ?? decode(s.title),
    level,
    words: text.join(' ').split(/\s+/).length,
    url: s.url,
    audio,
    credit,
    license: { name: decode(license[2]), url: license[1] },
    pages: text,
    images,
    ...(turkish ? { turkish } : {}),
  })
  console.log(s.language, id, level, text.length, 'pages', turkish ? 'tr' : '-', credit.reader ?? '')
}
for (const lang of ['fr', 'es'] as const) {
  out[lang].sort((a, b) => a.level - b.level || a.words - b.words)
  writeFileSync(`src/data/storybooks/${lang}.json`, JSON.stringify(out[lang]))
  console.log(lang, out[lang].length, 'stories,', out[lang].filter((s) => s.turkish).length, 'with Turkish')
}
