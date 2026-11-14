/**
 * Takes a broken item out of the rounds until it is fixed (docs/ICERIK-FABRIKASI.md §6.4): its id goes into
 * content/retired/<lang>.json, and the next build leaves it out of the published files and lists it in the manifest's
 * `retired` (the app then skips it, also in a learner's due questions). A fixed item keeps its id: take it back with
 * --undo. An exam set's question ("…|2") is retired by its set's id.
 *
 *   npm run content -- retire <id> [<id>…] [--undo]
 *   npm run content -- build
 */
import { join } from 'node:path'
import { parseArgs } from './lib/args'
import { changeRetired, languageOfId } from './lib/retire'
import { loadRaw, loadRetired, writeJson } from './lib/store'

const { positional, flags } = parseArgs(process.argv.slice(2))
if (!positional.length) throw new Error('usage: retire <id> [<id>…] [--undo]')
const ids = positional.map((id) => id.replace(/\|\d+$/, ''))
let failed = false
for (const lang of ['fr', 'es'] as const) {
  const mine = ids.filter((id) => languageOfId(id) === lang)
  if (!mine.length) continue
  const known = new Set([...loadRaw(lang, 'reading'), ...loadRaw(lang, 'grammar')].map((i) => i.id))
  const before = loadRetired(lang)
  const { list, unknown } = changeRetired(before, mine, known, flags.undo === true)
  if (list.join() !== [...before].sort().join()) writeJson(join('content', 'retired', `${lang}.json`), list)
  for (const id of mine.filter((id) => !unknown.includes(id))) console.log(`${flags.undo ? 'back' : 'retired'}: ${id}`)
  for (const id of unknown) {
    console.error(`not a factory item: ${id}`)
    failed = true
  }
}
for (const id of ids.filter((id) => !languageOfId(id))) {
  console.error(`not a factory id (fr-… / es-…): ${id}; the app's bundled questions are fixed in src/data`)
  failed = true
}
if (failed) process.exitCode = 1
else console.log('now run: npm run content -- build')
