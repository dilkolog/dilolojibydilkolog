/** Bundle with rolldown; applies reviewed meaning supplements to the current packs, preserving manual edits. */
import { readFileSync, writeFileSync } from 'node:fs'
import { enrichPack, type MeaningSupplement } from '../src/data/wordpackEnrichment'
import type { Pack } from '../src/data/wordpackBuild'
const [version, file, ...flags] = process.argv.slice(2)
if (!version || !file) throw new Error('Usage: node apply.mjs VERSION supplements.json [--dry]')
const items = JSON.parse(readFileSync(file, 'utf8')) as MeaningSupplement[]
if (!Array.isArray(items) || items.some(s => !['en', 'fr', 'es'].includes(s.language))) throw new Error('Invalid supplement list')
// Validate every language before writing any pack.
const results = (['en', 'fr', 'es'] as const).map(language => {
  const path = `src/data/wordpack/${language}.json`
  const base = JSON.parse(readFileSync(path, 'utf8')) as Pack
  return { language, path, ...enrichPack(base, undefined, items.filter(s => s.language === language), version) }
})
for (const result of results) {
  if (!flags.includes('--dry')) writeFileSync(result.path, JSON.stringify(result.pack))
  console.log(`${result.language}: ${result.filled} filled, ${result.added} new translated headwords, ${result.corrected} corrected${flags.includes('--dry') ? ' (dry)' : ''}`)
}
