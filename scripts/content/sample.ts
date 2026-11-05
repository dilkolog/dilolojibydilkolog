/**
 * A random handful of a batch for a person to read (docs/ICERIK-FABRIKASI.md §5.4): content/review/<job>.md.
 *
 *   npm run content -- sample <job-id> [--n 10] [--seed 1]
 */
import { join } from 'node:path'
import type { ContentGrammar, ReadingItem } from '../../src/engine/contentTypes'
import { parseArgs } from './lib/args'
import { sampleMarkdown } from './lib/sample'
import { findJob, rawDir, readJsonl, writeFile } from './lib/store'

const { positional, flags } = parseArgs(process.argv.slice(2))
const job = findJob(positional[0] ?? '')
if (!job) throw new Error('usage: sample <job-id> [--n 10] [--seed 1]')
const { items } = readJsonl<ReadingItem | ContentGrammar>(join(rawDir(job.language, job.kind), `${job.id}.jsonl`))
const out = join('content', 'review', `${job.id}.md`)
writeFile(out, sampleMarkdown(job, items, Number(flags.n ?? 10), Number(flags.seed ?? 1)))
console.log(`wrote ${out}`)
