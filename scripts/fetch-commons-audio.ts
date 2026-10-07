/**
 * Lists Lingua Libre's recordings of a language on Wikimedia Commons (CC BY-SA, one word per file:
 * "LL-Q1321 (spa)-Speaker-word.wav") and writes word → recording for scripts/build-wordpack.ts,
 * which gives them to words of the pack that have none (Spanish has almost none in Wiktionary).
 *
 * Usage: npx rolldown scripts/fetch-commons-audio.ts -o /tmp/a.mjs -p node && node /tmp/a.mjs es out.audio.json
 */
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const CATEGORY: Record<string, string> = { es: 'Lingua_Libre_pronunciation-spa', fr: 'Lingua_Libre_pronunciation-fra', en: 'Lingua_Libre_pronunciation-eng' }
const [language, out] = process.argv.slice(2)
if (!CATEGORY[language] || !out) {
  console.error('Usage: node a.mjs <es|fr|en> <out.audio.json>')
  process.exit(1)
}

/**
 * The file itself on Commons, at the path its name's MD5 gives. Not the MP3 Commons makes of it:
 * that is missing for some files (404), the original never is (a short WAV, under 100 KB).
 */
export function commonsFile(file: string): string {
  const name = file.replace(/ /g, '_')
  const md5 = createHash('md5').update(name).digest('hex')
  return `https://upload.wikimedia.org/wikipedia/commons/${md5[0]}/${md5.slice(0, 2)}/${encodeURIComponent(name)}`
}

/** "LL-Q1321 (spa)-Rodelar-(American Spanish) casa.wav" → casa. */
export function wordOf(file: string): string | undefined {
  const m = file.match(/^LL-Q\d+ \([a-z]{3}\)-[^-]+-(.+)\.(wav|ogg|flac|mp3)$/i)
  return m?.[1].replace(/^\([^)]*\)\s*/, '').trim().toLowerCase() || undefined
}

const words: Record<string, string> = {}
let cont: string | undefined
let files = 0
do {
  const q = new URLSearchParams({ action: 'query', list: 'categorymembers', cmtitle: `Category:${CATEGORY[language]}`, cmtype: 'file', cmlimit: '500', format: 'json', ...(cont ? { cmcontinue: cont } : {}) })
  let res: Response | undefined
  // Commons asks for a named client and a gentle pace; a 429 waits as long as it says, then tries again.
  for (let attempt = 0; attempt < 6; attempt++) {
    res = await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, { headers: { 'user-agent': 'kelime-koc-wordpack/1.0 (personal vocabulary app; low-volume build script)' } })
    if (res.status !== 429) break
    const wait = Number(res.headers.get('retry-after') ?? 0) * 1000 || 5000 * 2 ** attempt
    console.error(`429: waiting ${Math.round(wait / 1000)} s`)
    await new Promise((r) => setTimeout(r, wait))
  }
  if (!res?.ok) throw new Error(`commons ${res?.status}`)
  const j = (await res.json()) as { query: { categorymembers: { title: string }[] }; continue?: { cmcontinue: string } }
  for (const { title } of j.query.categorymembers) {
    files++
    const file = title.replace(/^File:/, '')
    const word = wordOf(file)
    if (word && !words[word]) words[word] = commonsFile(file)
  }
  cont = j.continue?.cmcontinue
  await new Promise((r) => setTimeout(r, 1000))
} while (cont)
writeFileSync(out, JSON.stringify({ language, words }))
console.log(`${language}: ${files} files, ${Object.keys(words).length} words`)
