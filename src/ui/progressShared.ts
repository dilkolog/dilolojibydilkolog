import type { ReviewEvent } from '../engine/types'

export const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('tr-TR', opts)

/** Answers and accuracy per week, oldest first, for the KPI sparklines. */
export function lastWeeks(events: readonly ReviewEvent[], now: Date, count: number): { answers: number; accuracy: number }[] {
  const WEEK = 7 * 86_400_000
  const out = Array.from({ length: count }, () => ({ answers: 0, correct: 0 }))
  for (const e of events) {
    if (e.mode === 'practice') continue
    const i = count - 1 - Math.floor((now.getTime() - e.timestamp.getTime()) / WEEK)
    if (i < 0 || i >= count) continue
    out[i].answers++
    if (e.correct) out[i].correct++
  }
  return out.map((w) => ({ answers: w.answers, accuracy: w.answers ? w.correct / w.answers : 0 }))
}
