/**
 * Builds src/data/wordpack/{en,fr,es}.json, the word pack (see src/data/wordpackBuild.ts), from
 * Wiktionary's structured dump by Wiktextract (https://kaikki.org/dictionary/rawdata.html,
 * CC BY-SA). One JSONL file per language edition entry set:
 *   English words (their translation tables carry the Turkish, French and Spanish forms):
 *     https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl
 *   French / Spanish words (pronunciation, recordings, origins, synonyms):
 *     https://kaikki.org/dictionary/French/kaikki.org-dictionary-French.jsonl
 *     https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl
 * The English file is the big one (about 2 GB). Words come from the frequency lists in
 * src/data/frequency, most frequent first, up to LIMIT per language.
 *
 * Usage: npx rolldown scripts/build-wordpack.ts -o /tmp/w.mjs -p node && node /tmp/w.mjs <version> <jsonl> [<jsonl> ...]
 * Prints, per language, how many words and how much of each field is covered. Check it before shipping.
 */
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { PackBuilder, packStats, type WtEntry } from '../src/data/wordpackBuild'

/** Words per language, most frequent first (LIMIT=… to change). */
const LIMIT = Number(process.env.LIMIT ?? 20000)
const [version, ...files] = process.argv.slice(2)
if (!version || !files.length) {
  console.error('Usage: node w.mjs <version> <wiktextract.jsonl> [...]')
  process.exit(1)
}

const builder = new PackBuilder()
for (const file of files) {
  let n = 0
  for await (const line of createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity })) {
    if (!line) continue
    try {
      builder.add(JSON.parse(line) as WtEntry)
    } catch {
      continue // a broken line is not worth stopping for
    }
    if (++n % 200_000 === 0) console.error(`${file}: ${n} lines`)
  }
  console.error(`${file}: ${n} lines`)
}

mkdirSync('src/data/wordpack', { recursive: true })
for (const language of ['en', 'fr', 'es'] as const) {
  const wanted = readFileSync(`src/data/frequency/${language}.txt`, 'utf8').split('\n').filter(Boolean)
  const pack = builder.finish(language, wanted, version, LIMIT)
  writeFileSync(`src/data/wordpack/${language}.json`, JSON.stringify(pack))
  const s = packStats(pack)
  console.log(language, `${s.words} words, ${(s.bytes / 1024).toFixed(0)} KB`, Object.entries(s.coverage).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(' '))
}
