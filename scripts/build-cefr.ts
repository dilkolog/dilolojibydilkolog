/**
 * Builds the CEFR word levels (src/data/cefr/{fr,es}.txt) from CEFRLex's graded lexicons
 * (UCLouvain CENTAL, CC BY-NC-SA 4.0; see src/data/cefr/SOURCE.md): FLELex (CRF version) for French,
 * ELELex for Spanish. Download them from https://cental.uclouvain.be/cefrlex/ first.
 *
 * Usage: npx tsx scripts/build-cefr.ts <FleLex_CRF.csv> <ELELex.tsv>
 *
 * A word's level is the first level whose learner material uses it more than in passing: a
 * frequency of at least 10 per million in FLELex, three or more documents in ELELex (lower bars put
 * thousands of words at A1, since textbooks touch many words once or twice). Of a word's parts of
 * speech, the earliest level counts. Each file lists `word<TAB>level`, level by level, most
 * frequent first.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
type Level = (typeof LEVELS)[number]

/** Tokenizer spacing undone: "c' est - à - dire" → "c'est-à-dire", "a_el_borde" → "a el borde". */
const clean = (w: string) =>
  w
    .replace(/"/g, '')
    .replace(/_/g, ' ')
    .replace(/’/g, "'")
    .replace(/\s*'\s*/g, "'")
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()

function build(rows: { word: string; level: Level | null; total: number }[]): string {
  const best = new Map<string, { level: Level; total: number }>()
  for (const r of rows) {
    if (!r.level || !/\p{L}/u.test(r.word)) continue
    const had = best.get(r.word)
    if (!had) best.set(r.word, { level: r.level, total: r.total })
    else best.set(r.word, { level: LEVELS.indexOf(r.level) < LEVELS.indexOf(had.level) ? r.level : had.level, total: had.total + r.total })
  }
  return [...best]
    .sort(([, a], [, b]) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || b.total - a.total)
    .map(([w, { level }]) => `${w}\t${level}`)
    .join('\n')
}

function flelex(path: string) {
  const [, ...lines] = readFileSync(path, 'utf8').trim().split('\n')
  return lines.map((line) => {
    const [word, , ...nums] = line.split('\t')
    const freqs = nums.slice(0, 6).map(Number)
    const i = freqs.findIndex((f) => f >= 10)
    return { word: clean(word), level: i < 0 ? null : LEVELS[i], total: Number(nums[6]) || 0 }
  })
}

function elelex(path: string) {
  const [, ...lines] = readFileSync(path, 'utf8').trim().split('\n')
  return lines.map((line) => {
    const cells = line.split('\t').map((c) => c.replace(/"/g, ''))
    const docs = cells.slice(8, 13).map(Number)
    const i = docs.findIndex((d) => d >= 3)
    return { word: clean(cells[0]), level: i < 0 ? null : LEVELS[i], total: Number(cells[7]) || 0 }
  })
}

const [fr, es] = process.argv.slice(2)
if (!fr || !es) throw new Error('Usage: npx tsx scripts/build-cefr.ts <FleLex_CRF.csv> <ELELex.tsv>')
for (const [lang, text] of [['fr', build(flelex(fr))], ['es', build(elelex(es))]] as const) {
  writeFileSync(`src/data/cefr/${lang}.txt`, text + '\n')
  const counts = Object.fromEntries(LEVELS.map((l) => [l, text.split('\n').filter((x) => x.endsWith(`\t${l}`)).length]))
  console.log(lang, text.split('\n').length, counts)
}
