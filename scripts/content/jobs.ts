/**
 * Job orders from the curriculum matrix (docs/ICERIK-FABRIKASI.md §3): the emptiest cells first.
 *
 *   npm run content -- jobs <fr|es> <reading|grammar> [--count 5] [--size N] [--level B1] [--theme sante] [--genre story] [--topic subjonctif] [--dry]
 *   npm run content -- jobs <fr|es> reading --starter [--count 25] [--dry]   (one job of starter texts, any theme and genre)
 *   npm run content -- jobs claim <job-id> --by <agent/branch>
 *   npm run content -- jobs list <fr|es> [reading|grammar]
 */
import { join } from 'node:path'
import type { ContentLevel } from '../../src/engine/contentTypes'
import { isLang, parseArgs } from './lib/args'
import { loadPlan } from './lib/context'
import { acceptedItems, grammarCells, nextJobs, openJobs, readingCells } from './lib/plan'
import { findJob, jobDir, loadJobs, loadRaw, loadReports, writeJson } from './lib/store'
import type { ContentJob, ContentKind } from './lib/types'

const { positional, flags } = parseArgs(process.argv.slice(2))
const STALE_MS = 48 * 3600 * 1000

if (positional[0] === 'claim') {
  const job = findJob(positional[1] ?? '')
  if (!job || typeof flags.by !== 'string') throw new Error('usage: jobs claim <job-id> --by <agent/branch>')
  if (job.claimedBy && job.claimedBy !== flags.by && Date.now() - Date.parse(job.claimedAt!) < STALE_MS) throw new Error(`${job.id} is claimed by ${job.claimedBy} since ${job.claimedAt}`)
  writeJson(join(jobDir(job.language, job.kind), `${job.id}.json`), { ...job, claimedBy: flags.by, claimedAt: new Date().toISOString() })
  console.log(`${job.id} claimed by ${flags.by}`)
} else if (positional[0] === 'list') {
  const lang = positional[1]
  if (!isLang(lang)) throw new Error('usage: jobs list <fr|es> [reading|grammar]')
  const reports = loadReports()
  for (const kind of (positional[2] ? [positional[2]] : ['reading', 'grammar']) as ContentKind[]) {
    const open = new Set(openJobs(loadJobs(lang, kind), reports).map((j) => j.id))
    for (const j of loadJobs(lang, kind)) {
      const state = !open.has(j.id) ? 'done' : !j.claimedBy ? 'free' : Date.now() - Date.parse(j.claimedAt!) > STALE_MS ? `stale (${j.claimedBy})` : `claimed by ${j.claimedBy}`
      console.log(`${j.id}\t${j.level}\t${j.grammar.join(',')}\t${j.theme ?? ''}\t${j.genre ?? ''}\t${j.count}\tids ${j.ids.from}–${j.ids.to}\t${state}`)
    }
  }
} else if (flags.starter) {
  const lang = positional[0]
  if (!isLang(lang) || positional[1] !== 'reading') throw new Error('usage: jobs <fr|es> reading --starter [--count 25]')
  if (!loadPlan(lang).starter) throw new Error(`content/plan/${lang}.json has no starter band`)
  const jobs = loadJobs(lang, 'reading')
  const count = Number(flags.count ?? 25)
  const seq = Math.max(0, ...jobs.map((j) => Number(j.id.slice(-4))).filter(Number.isFinite)) + 1
  const from = Math.max(0, ...jobs.map((j) => j.ids.to), ...loadRaw(lang, 'reading').map((r) => Number(r.id.slice(-6))).filter(Number.isFinite)) + 1
  const job: ContentJob = { id: `${lang}-reading-${String(seq).padStart(4, '0')}`, language: lang, kind: 'reading', level: 'A1', grammar: [lang === 'fr' ? 'basics_fr_present' : 'basics_es_presente'], count, starter: true, ids: { from, to: from + count - 1 }, createdAt: new Date().toISOString() }
  if (!flags.dry) writeJson(join(jobDir(lang, 'reading'), `${job.id}.json`), job)
  console.log(`${flags.dry ? '[dry] ' : ''}${job.id}: starter A1 × ${count} (ids ${from}–${job.ids.to})`)
} else {
  const [lang, kind] = positional
  if (!isLang(lang) || (kind !== 'reading' && kind !== 'grammar')) throw new Error('usage: jobs <fr|es> <reading|grammar> [--count N] …')
  const plan = loadPlan(lang)
  const reports = loadReports()
  const jobs = loadJobs(lang, kind)
  const open = openJobs(jobs, reports)
  const raw = kind === 'reading' ? loadRaw(lang, 'reading') : loadRaw(lang, 'grammar')
  const accepted = acceptedItems(raw as { id: string }[], reports)
  const cells = kind === 'reading' ? readingCells(plan, accepted as never, open) : grammarCells(plan, accepted as never, open)
  const topicUse = new Map<string, number>()
  if (kind === 'reading') {
    for (const r of loadRaw(lang, 'reading')) for (const t of r.grammar) topicUse.set(`${r.level}|${t}`, (topicUse.get(`${r.level}|${t}`) ?? 0) + 1)
    for (const j of open) for (const t of j.grammar) topicUse.set(`${j.level}|${t}`, (topicUse.get(`${j.level}|${t}`) ?? 0) + j.count)
  }
  const made = nextJobs(
    plan,
    kind,
    cells,
    loadJobs(lang, 'reading').concat(loadJobs(lang, 'grammar')).filter((j) => j.kind === kind),
    raw.map((r) => Number(r.id.slice(-6))).filter(Number.isFinite),
    {
      count: Number(flags.count ?? 5),
      size: flags.size ? Number(flags.size) : undefined,
      level: typeof flags.level === 'string' ? (flags.level as ContentLevel) : undefined,
      theme: typeof flags.theme === 'string' ? flags.theme : undefined,
      genre: typeof flags.genre === 'string' ? flags.genre : undefined,
      topic: typeof flags.topic === 'string' ? flags.topic : undefined,
    },
    topicUse,
  )
  for (const j of made) {
    if (!flags.dry) writeJson(join(jobDir(lang, kind), `${j.id}.json`), j)
    console.log(`${flags.dry ? '[dry] ' : ''}${j.id}: ${j.level} ${j.grammar.join(',')} ${j.theme ?? ''} ${j.genre ?? ''} × ${j.count} (ids ${j.ids.from}–${j.ids.to})`)
  }
  if (!made.length) console.log('no empty cell matches')
}
