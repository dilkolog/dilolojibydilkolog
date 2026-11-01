/**
 * Builds src/data/wordpack/{en,fr,es}.json, the word pack (see src/data/wordpackBuild.ts), from
 * Wiktionary's structured dump by Wiktextract (https://kaikki.org/dictionary/rawdata.html,
 * CC BY-SA). One JSONL file per language edition entry set:
 *   English words (their translation tables carry the Turkish, French and Spanish forms):
 *     https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl
 *   French / Spanish words (pronunciation, recordings, origins, synonyms):
 *     https://kaikki.org/dictionary/French/kaikki.org-dictionary-French.jsonl
 *     https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl
 * Turkish meanings also come from the Turkish Wiktionary (a file whose name contains "trwiktionary":
 *   https://kaikki.org/trwiktionary/raw-wiktextract-data.jsonl): its entries define words in Turkish.
 * Recordings for words Wiktionary has none for: a "*.audio.json" from scripts/fetch-commons-audio.ts.
 * The English file is the big one (about 2 GB). Words come from the frequency lists in
 * src/data/frequency, most frequent first, up to LIMIT per language.
 *
 * Usage: npx rolldown scripts/build-wordpack.ts -o /tmp/w.mjs -p node && node /tmp/w.mjs <version> <jsonl> [<jsonl> ...]
 * Prints, per language, how many words and how much of each field is covered. Check it before shipping.
 */
import { createReadStream, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { enrichPack, type MeaningSupplement } from '../src/data/wordpackEnrichment'
import { PackBuilder, packStats, type WtEntry, type Pack } from '../src/data/wordpackBuild'

/** Words per language, most frequent first (LIMIT=… to change). */
const LIMIT = Number(process.env.LIMIT ?? 50000)
if (!Number.isInteger(LIMIT) || LIMIT < 1) throw new Error('LIMIT must be a positive integer')
const OUTPUT = process.env.WORDPACK_OUTPUT ?? 'src/data/wordpack'
const supplementalPath = process.env.WORDPACK_SUPPLEMENTS
const supplements: MeaningSupplement[] = supplementalPath ? JSON.parse(readFileSync(supplementalPath, 'utf8')) as MeaningSupplement[] : readdirSync('src/data/wordpack-supplements').filter(f => f.endsWith('.json')).sort().flatMap(f => JSON.parse(readFileSync(`src/data/wordpack-supplements/${f}`, 'utf8')) as MeaningSupplement[])
const [version, ...files] = process.argv.slice(2)
if (!version || !files.length) {
  console.error('Usage: node w.mjs <version> <wiktextract.jsonl> [...]')
  process.exit(1)
}

const builder = new PackBuilder()
for (const file of files) {
  // Recordings from elsewhere (scripts/fetch-commons-audio.ts): { language, words: { word: url } }.
  if (file.endsWith('.audio.json')) {
    const { language, words } = JSON.parse(readFileSync(file, 'utf8')) as { language: 'en' | 'fr' | 'es'; words: Record<string, string> }
    for (const [word, url] of Object.entries(words)) builder.addAudio(language, word, url)
    console.error(`${file}: ${Object.keys(words).length} recordings`)
    continue
  }
  // The Turkish Wiktionary's dump (kaikki.org/trwiktionary) is read for Turkish meanings only.
  const turkish = /trwiktionary/.test(file)
  let n = 0
  let invalid = 0
  for await (const line of createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity })) {
    if (!line) continue
    try {
      if (turkish) builder.addTurkish(JSON.parse(line) as WtEntry)
      else builder.add(JSON.parse(line) as WtEntry)
    } catch {
      invalid++
      continue // a broken line is not worth stopping for
    }
    if (++n % 200_000 === 0) console.error(`${file}: ${n} lines, ${invalid} invalid`)
  }
  console.error(`${file}: ${n} lines, ${invalid} invalid`)
}

mkdirSync(OUTPUT, { recursive: true })
for (const language of ['en', 'fr', 'es'] as const) {
  const wanted = readFileSync(`src/data/frequency/${language}.txt`, 'utf8').split('\n').filter(Boolean)
  const fresh = builder.finish(language, wanted, version, LIMIT, true)
  const current = `src/data/wordpack/${language}.json`
  const base: Pack = existsSync(current) ? JSON.parse(readFileSync(current, 'utf8')) as Pack : { v: version, w: {} }
  const { pack } = enrichPack(base, fresh, supplements.filter(s => s.language === language), version)
  writeFileSync(`${OUTPUT}/${language}.json`, JSON.stringify(pack))
  const s = packStats(pack)
  console.log(language, `${s.words} words, ${(s.bytes / 1024).toFixed(0)} KB`, Object.entries(s.coverage).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(' '))
}
