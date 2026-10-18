/**
 * What the learner did with each question of the guide's checks, so that a lesson asks first what was missed, then
 * what was never asked, then what was answered right the longest ago. Kept on this device (not synced): it only
 * orders the questions, it is not progress.
 */
export interface QuestionRecord {
  /** Times asked. */
  n: number
  /** Whether the last answer was wrong. */
  lastWrong: boolean
  /** The day of the last answer (YYYY-MM-DD). */
  day: string
}
export type QuestionLog = Record<string, QuestionRecord>

/** The most questions remembered; the ones answered longest ago go first. */
export const MAX_LOGGED = 2000

/** A short stable key for a question (its prompt can be long). */
export function questionKey(language: string, prompt: string): string {
  let h = 2166136261
  for (const ch of `${language}|${prompt}`) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619) >>> 0
  return h.toString(36)
}

/** The log with these answers added (a new object). */
export function recordAnswers(log: QuestionLog, answers: { key: string; right: boolean }[], today: string): QuestionLog {
  const next = { ...log }
  for (const a of answers) next[a.key] = { n: (next[a.key]?.n ?? 0) + 1, lastWrong: !a.right, day: today }
  const keys = Object.keys(next)
  if (keys.length <= MAX_LOGGED) return next
  const keep = keys.sort((x, y) => next[y]!.day.localeCompare(next[x]!.day)).slice(0, MAX_LOGGED)
  return Object.fromEntries(keep.map((k) => [k, next[k]!]))
}

/** The log read from storage: anything not shaped like a record is dropped. */
export function cleanQuestionLog(raw: unknown): QuestionLog {
  const out: QuestionLog = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const r = v as Partial<QuestionRecord> | null
    if (r && typeof r.n === 'number' && typeof r.day === 'string') out[k] = { n: r.n, lastWrong: !!r.lastWrong, day: r.day }
  }
  return out
}

/**
 * The questions in the order to ask them: missed last time, then never asked, then answered right (the longest ago
 * first). The order inside each group is the order given, so a shuffled list stays shuffled.
 */
export function rankByNeed<T extends { prompt: string }>(items: readonly T[], log: QuestionLog, language: string): T[] {
  const rank = (item: T): [number, string] => {
    const r = log[questionKey(language, item.prompt)]
    if (!r) return [1, '']
    return r.lastWrong ? [0, r.day] : [2, r.day]
  }
  return items
    .map((item, i) => ({ item, i, r: rank(item) }))
    .sort((a, b) => a.r[0] - b.r[0] || a.r[1].localeCompare(b.r[1]) || a.i - b.i)
    .map((x) => x.item)
}
