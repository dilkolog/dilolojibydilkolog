import { CONTENT_LEVELS, type ContentGrammar, type ContentLanguage, type ContentLevel, type ReadingItem } from '../../../src/engine/contentTypes'
import { LESSON_TENSE } from '../../../src/data/guide/tenseTopics'
import { TOPIC_NAME } from '../../../src/engine/grammar'
import { hasPattern } from '../../../src/engine/lessonExamples'
import type { CheckReport, ContentJob, ContentKind, ContentPlan } from './types'

/**
 * The matrix's cells, how full each is and which to fill next (docs/ICERIK-FABRIKASI.md §3, §8). Only accepted
 * items count (a report lists them); open jobs count as planned, so two runs of the job tool do not ask for the same gap.
 */
export interface Cell {
  key: string
  level: ContentLevel
  theme?: string
  genre?: string
  topic?: string
  have: number
  planned: number
  target: number
}

export const cellKey = (kind: ContentKind, level: string, a: string, b?: string) => (kind === 'reading' ? `${level}|${a}|${b}` : `${level}|${a}`)

/** Accepted items: in a report's accepted list and still in the raw files. */
export function acceptedItems<T extends { id: string }>(items: readonly T[], reports: readonly CheckReport[]): T[] {
  const ok = new Set(reports.flatMap((r) => r.accepted))
  return items.filter((i) => ok.has(i.id))
}

/** A job is open until a report accepts as many items as it asked for. */
export function openJobs(jobs: readonly ContentJob[], reports: readonly CheckReport[]): ContentJob[] {
  const byJob = new Map(reports.map((r) => [r.job, r.accepted.length]))
  return jobs.filter((j) => (byJob.get(j.id) ?? 0) < j.count)
}

export function readingCells(plan: ContentPlan, items: readonly ReadingItem[], open: readonly ContentJob[]): Cell[] {
  const have = new Map<string, number>()
  for (const i of items) have.set(cellKey('reading', i.level, i.theme, i.genre), (have.get(cellKey('reading', i.level, i.theme, i.genre)) ?? 0) + 1)
  const planned = new Map<string, number>()
  for (const j of open) if (j.kind === 'reading') planned.set(cellKey('reading', j.level, j.theme!, j.genre), (planned.get(cellKey('reading', j.level, j.theme!, j.genre)) ?? 0) + j.count)
  return CONTENT_LEVELS.flatMap((level) =>
    plan.themes.flatMap((t) =>
      plan.genres.map((g) => {
        const key = cellKey('reading', level, t.id, g.id)
        return { key, level, theme: t.id, genre: g.id, have: have.get(key) ?? 0, planned: planned.get(key) ?? 0, target: plan.targets.reading.perCell }
      }),
    ),
  )
}

export function grammarCells(plan: ContentPlan, items: readonly ContentGrammar[], open: readonly ContentJob[]): Cell[] {
  const have = new Map<string, number>()
  for (const i of items) have.set(cellKey('grammar', i.level, i.topic), (have.get(cellKey('grammar', i.level, i.topic)) ?? 0) + 1)
  const planned = new Map<string, number>()
  for (const j of open) if (j.kind === 'grammar') planned.set(cellKey('grammar', j.level, j.grammar[0]), (planned.get(cellKey('grammar', j.level, j.grammar[0])) ?? 0) + j.count)
  return CONTENT_LEVELS.flatMap((level) =>
    plan.levels[level].topics.map((topic) => {
      const key = cellKey('grammar', level, topic)
      return { key, level, topic, have: have.get(key) ?? 0, planned: planned.get(key) ?? 0, target: plan.targets.grammar.perTopicLevel }
    }),
  )
}

const fill = (c: Cell) => (c.have + c.planned) / c.target

/** The emptiest cells first; among equals, the levels, themes and genres with least content, so new jobs spread out. */
export function emptiest(cells: readonly Cell[]): Cell[] {
  const sum = (pick: (c: Cell) => string | undefined) => {
    const m = new Map<string, number>()
    for (const c of cells) {
      const k = pick(c)
      if (k) m.set(k, (m.get(k) ?? 0) + c.have + c.planned)
    }
    return (c: Cell) => m.get(pick(c) ?? '') ?? 0
  }
  const level = sum((c) => c.level)
  const theme = sum((c) => c.theme)
  const genre = sum((c) => c.genre)
  return cells
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.have + c.planned < c.target)
    .sort((a, b) => fill(a.c) - fill(b.c) || level(a.c) - level(b.c) || theme(a.c) - theme(b.c) || genre(a.c) - genre(b.c) || a.i - b.i)
    .map(({ c }) => c)
}

export interface JobOptions {
  count: number
  level?: ContentLevel
  theme?: string
  genre?: string
  topic?: string
  /** Items per job (default: the plan's job size). */
  size?: number
  now?: Date
}

const seqOf = (id: string) => Number(id.split('-').pop())

/**
 * New jobs for the emptiest cells. Each gets its own range of item numbers after every number any job or raw item
 * has used, so agents working in parallel never write the same id.
 */
export function nextJobs(
  plan: ContentPlan,
  kind: ContentKind,
  cells: readonly Cell[],
  jobs: readonly ContentJob[],
  usedNumbers: readonly number[],
  opts: JobOptions,
  readingTopicUse: ReadonlyMap<string, number> = new Map(),
): ContentJob[] {
  const lang: ContentLanguage = plan.language
  let seq = Math.max(0, ...jobs.map((j) => seqOf(j.id)))
  let next = Math.max(0, ...jobs.map((j) => j.ids.to), ...usedNumbers) + 1
  const size = opts.size ?? plan.jobSize[kind]
  const candidates = emptiest(cells).filter((c) => (!opts.level || c.level === opts.level) && (!opts.theme || c.theme === opts.theme) && (!opts.genre || c.genre === opts.genre) && (!opts.topic || c.topic === opts.topic))
  // Chosen one at a time: a theme or genre just given a job goes to the back, so a run of jobs spreads out.
  const given = new Map<string, number>()
  const weight = (c: Cell) => (given.get(`t:${c.theme}`) ?? 0) + (given.get(`g:${c.genre}`) ?? 0) + (given.get(`l:${c.level}`) ?? 0)
  const chosen: Cell[] = []
  const pool = [...candidates]
  while (chosen.length < opts.count && pool.length) {
    let best = 0
    for (let i = 1; i < pool.length; i++) if (fill(pool[i]) < fill(pool[best]) || (fill(pool[i]) === fill(pool[best]) && weight(pool[i]) < weight(pool[best]))) best = i
    const [cell] = pool.splice(best, 1)
    chosen.push(cell)
    for (const k of [`t:${cell.theme}`, `g:${cell.genre}`, `l:${cell.level}`]) given.set(k, (given.get(k) ?? 0) + 1)
  }
  const use = new Map(readingTopicUse)
  const out: ContentJob[] = []
  for (const cell of chosen) {
    const count = Math.min(size, cell.target - cell.have - cell.planned)
    let grammar: string[]
    if (kind === 'grammar') grammar = [cell.topic!]
    else {
      // The level's topic the texts have used least (a tense or a pattern the checks can count, when there is one).
      const all = plan.levels[cell.level].topics.filter((t) => TOPIC_NAME[t])
      const countable = all.filter((t) => LESSON_TENSE[t] || hasPattern(t))
      const topics = countable.length ? countable : all
      const pick = [...topics].sort((a, b) => (use.get(`${cell.level}|${a}`) ?? 0) - (use.get(`${cell.level}|${b}`) ?? 0))[0]
      use.set(`${cell.level}|${pick}`, (use.get(`${cell.level}|${pick}`) ?? 0) + count)
      grammar = [pick]
    }
    seq++
    out.push({
      id: `${lang}-${kind}-${String(seq).padStart(4, '0')}`,
      language: lang,
      kind,
      level: cell.level,
      ...(kind === 'reading' ? { theme: cell.theme, genre: cell.genre } : {}),
      grammar,
      count,
      ...(kind === 'grammar' ? { subskills: plan.subskills[cell.topic!] ?? plan.subskills.default } : {}),
      ids: { from: next, to: next + count - 1 },
      createdAt: (opts.now ?? new Date()).toISOString(),
    })
    next += count
  }
  return out
}

/** docs/veri/icerik-kapsama.md: per level and topic, and the 20 emptiest cells. */
export function coverageMarkdown(lang: ContentLanguage, plan: ContentPlan, reading: readonly Cell[], grammar: readonly Cell[]): string {
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : '–')
  const theme = new Map(plan.themes.map((t) => [t.id, t.tr]))
  const genre = new Map(plan.genres.map((g) => [g.id, g.tr]))
  const lines = [`## ${lang === 'fr' ? 'Fransızca' : 'İspanyolca'}`, '', '### Okuma metinleri', '', '| Seviye | Var | Planlı | Hedef | Dolu |', '|---|---|---|---|---|']
  for (const level of CONTENT_LEVELS) {
    const at = reading.filter((c) => c.level === level)
    const have = at.reduce((n, c) => n + c.have, 0)
    const target = at.reduce((n, c) => n + c.target, 0)
    lines.push(`| ${level} | ${have} | ${at.reduce((n, c) => n + c.planned, 0)} | ${target} | ${pct(have, target)} |`)
  }
  lines.push('', '### Dilbilgisi soruları', '', '| Seviye | Konu | Var | Planlı | Hedef | Dolu |', '|---|---|---|---|---|---|')
  for (const c of grammar) lines.push(`| ${c.level} | ${TOPIC_NAME[c.topic!] ?? c.topic} (\`${c.topic}\`) | ${c.have} | ${c.planned} | ${c.target} | ${pct(c.have, c.target)} |`)
  lines.push('', '### En boş 20 hücre', '', '| Tür | Hücre | Var | Planlı | Hedef |', '|---|---|---|---|---|')
  const both = [...reading.map((c) => ({ kind: 'okuma', c })), ...grammar.map((c) => ({ kind: 'dilbilgisi', c }))].sort((a, b) => fill(a.c) - fill(b.c)).slice(0, 20)
  for (const { kind, c } of both) {
    const name = c.topic ? `${c.level} · ${TOPIC_NAME[c.topic] ?? c.topic}` : `${c.level} · ${theme.get(c.theme!)} · ${genre.get(c.genre!)}`
    lines.push(`| ${kind} | ${name} | ${c.have} | ${c.planned} | ${c.target} |`)
  }
  return lines.join('\n')
}
