import type { TargetLanguage } from './types'
import type { SentenceCard } from './sentences'

/** One day of the coming week: how many sentence cards fall due on it (day 0 = today, with everything already overdue). */
export interface SentenceDay {
  /** Local day, YYYY-MM-DD. */
  day: string
  count: number
}

const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * The sentence cards of one language by the day they fall due, for `days` days from today. What is already due (or late)
 * counts for today; a card that falls due after the last day is not counted. Cards never studied are due at once
 * (their scheduler date is their creation), so they are in today's number too.
 */
export function sentenceForecast(cards: readonly SentenceCard[], language: TargetLanguage, now: Date, days = 7): SentenceDay[] {
  const out: SentenceDay[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    return { day: localDay(d), count: 0 }
  })
  const index = new Map(out.map((d, i) => [d.day, i]))
  const today = localDay(now)
  for (const s of cards) {
    if (s.language !== language) continue
    const due = new Date(s.card.due)
    if (Number.isNaN(due.getTime())) continue
    const key = localDay(due)
    const at = key <= today ? 0 : index.get(key)
    if (at !== undefined) out[at].count++
  }
  return out
}

/** The sentence cards due in the whole window, and the busiest day (for the chart's scale). */
export function forecastTotals(days: readonly SentenceDay[]): { total: number; peak: number } {
  return { total: days.reduce((n, d) => n + d.count, 0), peak: Math.max(0, ...days.map((d) => d.count)) }
}
