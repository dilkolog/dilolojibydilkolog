/**
 * Publishes accepted content (docs/ICERIK-FABRIKASI.md §6.1) into public/content/<lang>/: a manifest and files
 * by level (texts) and topic (questions). An item goes in only when a report accepted it and it still passes the
 * check now. The language's folder is written anew each time.
 *
 *   npm run content -- build [fr] [es]
 */
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import type { ContentGrammar, ReadingItem } from '../../src/engine/contentTypes'
import { isLang, parseArgs } from './lib/args'
import { checkBatch } from './lib/batch'
import { loadContext } from './lib/context'
import { acceptedItems } from './lib/plan'
import { buildContent, oversized } from './lib/shards'
import { loadRaw, loadReports, loadRetired, writeFile } from './lib/store'

const { positional } = parseArgs(process.argv.slice(2))
const langs = positional.length ? positional.filter(isLang) : (['fr', 'es'] as const)
const reports = loadReports()
for (const lang of langs) {
  const ctx = loadContext(lang)
  const reading = acceptedItems(loadRaw(lang, 'reading'), reports)
  const grammar = acceptedItems(loadRaw(lang, 'grammar'), reports)
  const okReading = new Set(checkBatch('reading', reading, ctx).accepted)
  const okGrammar = new Set(checkBatch('grammar', grammar, ctx).accepted)
  const dropped = reading.length - okReading.size + grammar.length - okGrammar.size
  const built = buildContent(
    lang,
    reading.filter((r) => okReading.has(r.id)) as ReadingItem[],
    grammar.filter((g) => okGrammar.has(g.id)) as ContentGrammar[],
    loadRetired(lang),
  )
  const dir = join('public', 'content', lang)
  rmSync(dir, { recursive: true, force: true })
  for (const [path, text] of built.files) writeFile(join(dir, path), text)
  const m = built.manifest
  console.log(`${lang}: ${m.counts.reading.total} texts, ${m.counts.grammar.total} questions, ${built.files.size} files (version ${m.version})${dropped ? `; ${dropped} accepted items fail the check now and were left out` : ''}`)
  for (const s of oversized(m)) console.log(`  ⚠ ${s.path} is ${Math.round(s.gzip / 1024)} KB gzipped (aim: 50–150)`)
}
