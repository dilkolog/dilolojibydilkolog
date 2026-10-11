import { readFileSync } from 'node:fs'
import { rootOf, type WordLookup } from '../src/engine/derive'
import { POS_CODE } from '../src/data/wordpackBuild'

/**
 * Lists the words (of the 6 000 most frequent) that the word-building engine takes for built from a
 * simpler word, to read through for coincidences (heure → heureux). A wrong pair goes into
 * FALSE_COUSINS in src/engine/derive.ts as `base|word`.
 * Usage: npx tsx scripts/audit-derive.ts [en|fr|es] [how many words, default 6000]
 */
const language = (process.argv[2] ?? 'en') as 'en' | 'fr' | 'es'
const count = Number(process.argv[3] ?? 6000)
const pack = (JSON.parse(readFileSync(`src/data/wordpack/${language}.json`, 'utf8')) as { w: Record<string, { p?: string; t?: string[] }> }).w
const words = readFileSync(`src/data/frequency/${language}.txt`, 'utf8').split('\n')
const rank = new Map<string, number>()
words.forEach((w, i) => {
  if (w && !rank.has(w)) rank.set(w, i + 1)
})
const lookup: WordLookup = (w) => {
  const r = pack[w]
  const pos = r?.p ? POS_CODE[r.p] : undefined
  return pos ? { pos, gloss: r.t?.[0], rank: rank.get(w) } : undefined
}
for (const w of words.slice(0, count)) {
  if (!w || !lookup(w)) continue
  const { root, steps } = rootOf(w, language, lookup)
  if (root !== w) console.log(`${w} <- ${root} [${steps.map((s) => s.form).join(', ')}]  (${lookup(w)?.gloss ?? ''} / ${lookup(root)?.gloss ?? ''})`)
}
