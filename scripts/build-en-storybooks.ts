/**
 * Builds the English easy illustrated stories (src/data/storybooks/en.json) from Global Storybooks
 * (https://globalstorybooks.net; CC BY): matching the 29 stories available in French and Spanish.
 *
 * Usage: npx tsx scripts/build-en-storybooks.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'

export interface Storybook {
  id: string
  language: 'en'
  title: string
  /** Global Storybooks level, 1 (a word a page) to 5. */
  level: number
  words: number
  url: string
  audio: string
  credit: { writer?: string; illustrator?: string; translator?: string; reader?: string }
  license: { name: string; url: string }
  pages: string[]
  images: string[]
  turkish?: string[]
}

const ROLES: Record<string, keyof Storybook['credit']> = {
  'Written by': 'writer',
  'Écrit par': 'writer',
  Texto: 'writer',
  'Illustrated by': 'illustrator',
  'Illustré par': 'illustrator',
  Ilustraciones: 'illustrator',
  'Translated by': 'translator',
  'Traduit par': 'translator',
  Traducción: 'translator',
  'Read by': 'reader',
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

async function main() {
  const frStories: { id: string; turkish?: string[]; level: number; pages: string[] }[] = JSON.parse(
    readFileSync('src/data/storybooks/fr.json', 'utf8')
  )
  const esStories: { id: string; turkish?: string[]; level: number; pages: string[] }[] = JSON.parse(
    readFileSync('src/data/storybooks/es.json', 'utf8')
  )

  const trMap = new Map<string, string[]>()
  for (const s of frStories) {
    const numId = s.id.replace('gsb-fr-', '')
    if (s.turkish) trMap.set(numId, s.turkish)
  }
  for (const s of esStories) {
    const numId = s.id.replace('gsb-es-', '')
    if (s.turkish && !trMap.has(numId)) trMap.set(numId, s.turkish)
  }

  // Unique 29 story IDs from FR
  const storyIds = frStories.map((s) => s.id.replace('gsb-fr-', '')).sort()
  console.log(`Building ${storyIds.length} English storybooks...`)

  const out: Storybook[] = []

  for (const id of storyIds) {
    const url = `https://global-asp.github.io/storybooks-english/stories/en/${id}/`
    const html = await get(url)
    if (!html) {
      console.warn('missing:', url)
      continue
    }

    const license = html.match(/rel="license" href="([^"]+)"[^>]*>(?!<img)([^<]+)</)
    const licenseUrl = license ? license[1] : 'https://creativecommons.org/licenses/by/3.0/'
    const licenseName = license ? decode(license[2]) : 'Creative Commons Attribution 3.0'

    const credit: Storybook['credit'] = {}
    for (const m of html.matchAll(/data-tooltip="([^"]+)"><img[^>]*><\/span>\s*([^<]+)<\/h3>/g)) {
      const role = ROLES[m[1]]
      if (role && !credit[role]) credit[role] = decode(m[2])
    }

    const audioMatch = html.match(/<audio id="audioplayer"[^>]*><source src="([^"]+)"/)?.[1]
    const audio = audioMatch ?? `https://globalstorybooks.net/media/audio/en/${id}/en-${id}.mp3`
    const level = Number(html.match(/\/level(\d)"/)?.[1] ?? 1)

    const own = pages(html)
    const ordered = [...own.keys()].sort()
    const body = ordered.filter((k) => k !== '01')
    const text = body.map((k) => own.get(k)!.text)
    const images = body.map((k) => own.get(k)!.image ?? '')

    const titleMatch = html.match(/class="def"><h1>([\s\S]*?)<\/h1>/)?.[1] ??
                       html.match(/<h1>\s*<span class="def">([\s\S]*?)<\/span>/)?.[1] ??
                       own.get('01')?.text ??
                       `Story ${id}`
    const title = decode(titleMatch)

    let turkish = trMap.get(id)
    if (!turkish || turkish.length !== text.length) {
      const trHtml = await get(`https://global-asp.github.io/storybooks-english/stories/tr/${id}/`)
      if (trHtml) {
        const trPages = pages(trHtml)
        if (body.every((k) => trPages.has(k))) {
          turkish = body.map((k) => trPages.get(k)!.text)
        }
      }
    }

    out.push({
      id: `gsb-en-${id}`,
      language: 'en',
      title,
      level,
      words: text.join(' ').split(/\s+/).length,
      url,
      audio,
      credit,
      license: { name: licenseName, url: licenseUrl },
      pages: text,
      images,
      ...(turkish && turkish.length === text.length ? { turkish } : {}),
    })

    console.log(`EN ${id}: ${title} (Level ${level}, ${text.length} pages, Turkish: ${turkish ? 'yes' : 'no'})`)
  }

  out.sort((a, b) => a.level - b.level || a.words - b.words)
  writeFileSync('src/data/storybooks/en.json', JSON.stringify(out, null, 2), 'utf8')
  console.log(`Done! Written ${out.length} stories to src/data/storybooks/en.json`)
}

void main()
