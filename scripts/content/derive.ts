/**
 * Exercises made by machine from accepted texts (docs/ICERIK-FABRIKASI.md §4.3): content/derived/<lang>/grammar.jsonl
 * (gaps of the target tense) and vocabulary.jsonl (gaps of the listed words). Not yet published (phase 3).
 *
 *   npm run content -- derive [fr] [es]
 */
import { join } from 'node:path'
import { isLang, parseArgs } from './lib/args'
import { loadContext } from './lib/context'
import { derive } from './lib/derive'
import { acceptedItems } from './lib/plan'
import { loadRaw, loadReports, writeFile } from './lib/store'

const { positional } = parseArgs(process.argv.slice(2))
const reports = loadReports()
for (const lang of positional.length ? positional.filter(isLang) : (['fr', 'es'] as const)) {
  const ctx = loadContext(lang)
  const all = acceptedItems(loadRaw(lang, 'reading'), reports).map((r) => derive(r, ctx))
  const grammar = all.flatMap((d) => d.grammar)
  const vocabulary = all.flatMap((d) => d.vocabulary)
  writeFile(join('content', 'derived', lang, 'grammar.jsonl'), grammar.map((g) => JSON.stringify(g)).join('\n') + (grammar.length ? '\n' : ''))
  writeFile(join('content', 'derived', lang, 'vocabulary.jsonl'), vocabulary.map((v) => JSON.stringify(v)).join('\n') + (vocabulary.length ? '\n' : ''))
  console.log(`${lang}: ${grammar.length} grammar gaps, ${vocabulary.length} word gaps from ${all.length} texts`)
}
