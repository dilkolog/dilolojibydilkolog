/**
 * Fetches and filters the frequency word lists from Hermit Dave's FrequencyWords (OpenSubtitles 2018),
 * writing them to src/data/frequency/{en,fr,es}.txt.
 *
 * Usage: npx tsx scripts/fetch-frequency.ts [limit]
 * Default limit: 35000
 */
import { writeFileSync } from 'node:fs'

const LIMIT = Number(process.argv[2] ?? 35000)
const LANGS = ['en', 'fr', 'es'] as const

async function fetchRaw(lang: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${lang}/${lang}_50k.txt`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`)
  return res.text()
}

function filterWord(w: string, lang: string): boolean {
  if (/\d/.test(w) || /\./.test(w) || /--/.test(w) || /^-|-$/.test(w)) return false
  if (lang === 'fr') return !/^[\x27\x60’]/.test(w) && !/[\x27\x60’]$/.test(w)
  return !/[\x27\x60’]/.test(w)
}

async function main() {
  for (const lang of LANGS) {
    console.log(`Fetching ${lang}...`)
    const raw = await fetchRaw(lang)
    const lines = raw.split('\n').filter(Boolean).map((l) => l.split(' ')[0])
    const filtered = lines.filter((w) => filterWord(w, lang))
    const slice = filtered.slice(0, LIMIT)
    writeFileSync(`src/data/frequency/${lang}.txt`, slice.join('\n') + '\n')
    console.log(`Wrote ${slice.length} words to src/data/frequency/${lang}.txt`)
  }
}

void main()
