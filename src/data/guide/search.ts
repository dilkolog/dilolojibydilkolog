import type { TopicLesson } from './lessonTypes'

/** Text for comparing: no accents or case, Turkish dotted and dotless i alike ("şart" is found by "sart", "Istek" by "istek"). */
export const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ı/g, 'i')

/** Where a search found a lesson: in its name or summary, or deeper (a rule, an example, a warning), with the line that matched. */
export interface LessonHit {
  where: 'title' | 'content'
  /** The line of the lesson that matched, shortened around the match, when the match is deeper than the summary. */
  snippet?: string
}

const SNIPPET = 90

/** A line cut to a stretch around the first of `words` it holds. */
function around(line: string, words: string[]): string {
  const folded = fold(line)
  const at = Math.max(0, Math.min(...words.map((w) => folded.indexOf(w)).filter((i) => i >= 0)))
  if (line.length <= SNIPPET) return line
  const start = Math.max(0, at - 20)
  return `${start > 0 ? '…' : ''}${line.slice(start, start + SNIPPET).trim()}${start + SNIPPET < line.length ? '…' : ''}`
}

/**
 * Whether a lesson answers a search: every word of the query is somewhere in the lesson (its name, summary, rules,
 * examples with their Turkish, warnings and tip), so "depuis" finds the lesson whose example uses it. `null` when not.
 */
export function searchLesson(lesson: TopicLesson, title: string, query: string, note?: string): LessonHit | null {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return { where: 'title' }
  const head = fold(`${title} ${lesson.summary}`)
  if (words.every((w) => head.includes(w))) return { where: 'title' }
  const tableLines = lesson.table ? [...(lesson.table.caption ? [lesson.table.caption] : []), lesson.table.head.join(' · '), ...lesson.table.rows.map((r) => r.join(' · '))] : []
  const lines = [...lesson.rules, ...tableLines, ...lesson.examples.map((x) => `${x.text} — ${x.tr}`), ...lesson.watch, ...(lesson.tip ? [lesson.tip] : []), ...(note?.trim() ? [`Notun: ${note.trim()}`] : [])]
  const all = fold(`${head} ${lines.join(' ')}`)
  if (!words.every((w) => all.includes(w))) return null
  const line = lines.find((l) => words.some((w) => fold(l).includes(w)))
  return { where: 'content', ...(line ? { snippet: around(line, words) } : {}) }
}

