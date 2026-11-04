/**
 * The automatic check of a batch (docs/ICERIK-FABRIKASI.md §5.1): content/raw/<lang>/<kind>/<job>.jsonl against the
 * rules and against all accepted content. Writes content/reports/<job>.json; fails below 95 % accepted.
 * A solver file (content/review/<job>.solver.json, §5.2) is read when it is there.
 *
 *   npm run content -- check <job-id> [--quiet]
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ContentGrammar, ReadingItem } from '../../src/engine/contentTypes'
import { parseArgs } from './lib/args'
import { checkBatch } from './lib/batch'
import { loadContext } from './lib/context'
import { acceptedItems } from './lib/plan'
import { solverStats, type SolverFile } from './lib/solver'
import { findJob, loadRaw, loadReports, rawDir, readJsonl, reportPath, writeJson } from './lib/store'
import { ACCEPT_RATE, type CheckReport } from './lib/types'

const { positional, flags } = parseArgs(process.argv.slice(2))
const job = findJob(positional[0] ?? '')
if (!job) throw new Error('usage: check <job-id> (the job file must exist)')
const path = join(rawDir(job.language, job.kind), `${job.id}.jsonl`)
if (!existsSync(path)) throw new Error(`no ${path}`)
const { items, broken } = readJsonl<ReadingItem | ContentGrammar>(path)
const ctx = loadContext(job.language)
const reports = loadReports().filter((r) => r.job !== job.id)
const others = acceptedItems(
  (job.kind === 'reading' ? loadRaw(job.language, 'reading') : loadRaw(job.language, 'grammar')).filter((i: { batch?: string }) => i.batch !== job.id) as { id: string }[],
  reports,
) as (ReadingItem | ContentGrammar)[]
const result = checkBatch(job.kind, items, ctx, { job, others })
for (const line of broken) result.rejected.push({ id: `line ${line}`, reasons: ['not valid JSON'] })
const total = items.length + broken.length
const report: CheckReport = { job: job.id, language: job.language, kind: job.kind, total, ...result, rate: total ? result.accepted.length / total : 0 }
const solverPath = join('content', 'review', `${job.id}.solver.json`)
if (existsSync(solverPath) && job.kind === 'grammar') report.solver = solverStats(items as ContentGrammar[], JSON.parse(readFileSync(solverPath, 'utf8')) as SolverFile)
writeJson(reportPath(job.id), report)
console.log(`${job.id}: ${result.accepted.length}/${total} accepted (${Math.round(report.rate * 100)} %), ${result.rejected.length} refused, ${result.warnings.length} with warnings`)
if (report.solver) console.log(`  solver: ${report.solver.disagreements}/${report.solver.checked} disagree (${Math.round(report.solver.rate * 100)} %)`)
for (const r of result.rejected) console.log(`  ✗ ${r.id}: ${r.reasons.join('; ')}`)
if (!flags.quiet) for (const w of result.warnings) console.log(`  ⚠ ${w.id}: ${w.reasons.join('; ')}`)
if (report.rate < ACCEPT_RATE) {
  console.log(`below ${ACCEPT_RATE * 100} %: fix the refused items before committing`)
  process.exitCode = 1
}
if (report.solver && report.solver.rate >= 0.05) {
  console.log('solver disagreement at or above 5 %: the batch needs a full review')
  process.exitCode = 1
}
