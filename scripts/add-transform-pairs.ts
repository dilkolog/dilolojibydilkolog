/**
 * Adds hand-written transform pairs (docs/veri/donusum-ciftleri/<lang>-NN.tsv) to
 * src/data/transforms/<lang>.json, after checking each against the verb tables
 * (src/engine/transformPairs.ts checkPair). A refused line is listed with its reason and not added.
 *
 * Input: verb <TAB> kind <TAB> fromTense <TAB> toTense <TAB> source [form] <TAB> target [form] <TAB> Turkish
 *
 * Usage: npx rolldown scripts/add-transform-pairs.ts -o /tmp/t.mjs -p node && node /tmp/t.mjs <fr|es> <file.tsv>… [--dry] [--replace]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import es from '../src/data/tenses/es.json'
import fr from '../src/data/tenses/fr.json'
import { addConjugations } from '../src/engine/conjugation'
import { addTenses, type Tense } from '../src/engine/tenses'
import { checkPair, pairId, plain, normForm, TRANSFORM_KINDS, type TransformKind, type TransformPair } from '../src/engine/transformPairs'

const [lang, ...rest] = process.argv.slice(2)
const files = rest.filter((a) => !a.startsWith('--'))
if ((lang !== 'fr' && lang !== 'es') || !files.length) throw new Error('usage: <fr|es> <file.tsv>… [--dry] [--replace]')
const dry = rest.includes('--dry')
const replace = rest.includes('--replace')
addTenses('es', es as Record<string, unknown>)
addTenses('fr', fr as Record<string, unknown>)
addConjugations('es', readFileSync('src/data/conjugation/es.txt', 'utf8'))
addConjugations('fr', readFileSync('src/data/conjugation/fr.txt', 'utf8'))

const path = `src/data/transforms/${lang}.json`
const store = new Map<string, TransformPair>((existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as TransformPair[]) : []).map((p) => [p.id, p]))
const sources = new Map([...store.values()].map((p) => [normForm(plain(p.source)), p.id]))
const end = (x: string) => (/[.!?…»"]$/.test(x) ? x : `${x}.`)

const added = Object.fromEntries(TRANSFORM_KINDS.map((k) => [k, 0])) as Record<TransformKind, number>
const refused = { ...added }
let kept = 0
const problems: string[] = []
const warnings: string[] = []
for (const file of files) {
  for (const [n, line] of readFileSync(file, 'utf8').split('\n').entries()) {
    if (!line.trim() || line.startsWith('#')) continue
    const cols = line.split('\t').map((x) => x.trim())
    const where = `${file.split('/').pop()}:${n + 1}: ${cols[0]} ${cols[1]} ${cols[2]}→${cols[3]}`
    const kind = (TRANSFORM_KINDS as string[]).includes(cols[1]) ? (cols[1] as TransformKind) : undefined
    const refuse = (why: string) => {
      problems.push(`${where}: ${why}`)
      if (kind) refused[kind]++
    }
    if (cols.length !== 7 || cols.some((c) => !c)) {
      refuse(`needs 7 filled columns, has ${cols.filter(Boolean).length}`)
      continue
    }
    const [verb, , from, to, source, target, tr] = cols
    const input = { verb, kind: cols[1], from, to, source: end(source), target: end(target), tr: end(tr) }
    const checked = checkPair(lang, input)
    if ('error' in checked) {
      refuse(checked.error)
      continue
    }
    const id = pairId(lang, verb, from as Tense, to as Tense, input.source)
    const key = normForm(plain(input.source))
    const seen = sources.get(key)
    if (seen && seen !== id) {
      refuse(`the source sentence is already in (${seen})`)
      continue
    }
    if (store.has(id) && !replace) {
      kept++
      continue
    }
    if (checked.warning) warnings.push(`${where}: ${checked.warning}`)
    store.set(id, { id, verb, kind: kind!, from: from as Tense, to: to as Tense, source: input.source, target: input.target, tr: input.tr, persons: checked.persons })
    sources.set(key, id)
    added[kind!]++
  }
}
const sorted = [...store.values()].sort((a, b) => a.verb.localeCompare(b.verb) || a.kind.localeCompare(b.kind) || a.source.localeCompare(b.source))
const total = Object.values(added).reduce((a, b) => a + b, 0)
if (!dry && total) writeFileSync(path, `${JSON.stringify(sorted, null, 0).replace(/\},\{/g, '},\n{')}\n`)
console.log(`${dry ? '[dry] ' : ''}added ${total}, left alone ${kept}, refused ${problems.length}`)
for (const k of TRANSFORM_KINDS) console.log(`  ${k}: +${added[k]} / refused ${refused[k]}`)
const byKind = Object.fromEntries(TRANSFORM_KINDS.map((k) => [k, sorted.filter((p) => p.kind === k).length]))
console.log(`  in the file now: ${JSON.stringify(byKind)}`)
for (const p of problems) console.log(`  ✗ ${p}`)
for (const w of warnings) console.log(`  ⚠ ${w}`)
