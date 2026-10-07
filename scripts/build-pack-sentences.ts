/**
 * Adds example sentences (with their Turkish) to the word pack's most frequent words, so the
 * dictionary shows a word in use offline from the first look. From Tatoeba's per-language exports
 * (CC BY 2.0 FR), https://downloads.tatoeba.org/exports/per_language/:
 *   <lang>/<lang>_sentences.tsv, tur/tur_sentences.tsv, <lang>/<lang>-tur_links.tsv,
 *   eng/eng-tur_links.tsv, and for French and Spanish <lang>/<lang>-eng_links.tsv: a sentence with no
 *   Turkish translation of its own takes its English translation's (few French ones have their own).
 * A word's sentences contain the word or one of its forms (the pack's form table). Run after
 * scripts/build-wordpack.ts; it reads src/data/wordpack/<lang>.json and writes it back with `c`.
 *
 * Usage: npx rolldown scripts/build-pack-sentences.ts -o /tmp/s.mjs -p node && node /tmp/s.mjs <tatoeba dir>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { pickSentences, sentenceTokens, type Candidate } from '../src/data/packSentences'
import type { Pack } from '../src/data/wordpackBuild'

const [dir] = process.argv.slice(2)
if (!dir) {
  console.error('Usage: node s.mjs <tatoeba dir>')
  process.exit(1)
}

/** Words per language that get sentences: the most frequent, where they help most. */
const WORDS = 3000
/** Candidates kept per word before choosing (enough to choose well, little memory). */
const KEEP = 60
const CODE = { en: 'eng', fr: 'fra', es: 'spa' } as const

const rows = (file: string) =>
  readFileSync(`${dir}/${file}`, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => l.split('\t'))

const turkish = new Map(rows('tur_sentences.tsv').map(([id, , text]) => [id, text]))
const linked = (file: string) => {
  const map = new Map<string, string>()
  for (const [src, tgt] of rows(file)) if (!map.has(src) && turkish.has(tgt)) map.set(src, turkish.get(tgt)!)
  return map
}
/** English sentence → its Turkish, the bridge for French and Spanish sentences with none of their own. */
const englishTurkish = linked('eng-tur_links.tsv')

for (const language of ['en', 'fr', 'es'] as const) {
  const code = CODE[language]
  const path = `src/data/wordpack/${language}.json`
  const pack = JSON.parse(readFileSync(path, 'utf8')) as Pack
  const wanted = new Set(Object.keys(pack.w).slice(0, WORDS))
  // A token → the pack word it is (the word itself or one of its forms).
  const wordOf = (t: string) => (wanted.has(t) ? t : pack.f?.[t] && wanted.has(pack.f[t]) ? pack.f[t] : undefined)
  const toTurkish = language === 'en' ? englishTurkish : linked(`${code}-tur_links.tsv`)
  const direct = toTurkish.size
  if (language !== 'en')
    for (const [src, eng] of rows(`${code}-eng_links.tsv`)) if (!toTurkish.has(src) && englishTurkish.has(eng)) toTurkish.set(src, englishTurkish.get(eng)!)
  const candidates = new Map<string, Candidate[]>()
  for (const [id, , text] of rows(`${code}_sentences.tsv`)) {
    const tr = toTurkish.get(id)
    if (!tr) continue
    for (const w of new Set(sentenceTokens(text, language).map(wordOf).filter((w): w is string => !!w))) {
      const list = candidates.get(w) ?? []
      if (list.length < KEEP) list.push({ text, turkish: tr })
      candidates.set(w, list)
    }
  }
  // Easy words: the language's 2000 most frequent (as in engine/sentenceFit.ts).
  const frequent = new Set(readFileSync(`src/data/frequency/${language}.txt`, 'utf8').split('\n').slice(0, 2000))
  let given = 0
  for (const w of wanted) {
    const picked = pickSentences(candidates.get(w) ?? [], language, (t) => frequent.has(t) || t === w)
    if (picked.length) {
      pack.w[w].c = picked
      given++
    } else delete pack.w[w].c
  }
  writeFileSync(path, JSON.stringify(pack))
  console.log(`${language}: ${toTurkish.size} sentences with Turkish (${direct} direct); ${given} of ${wanted.size} words got sentences`)
}
