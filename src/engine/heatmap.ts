import { localDate } from './progress'

/** Answers per day over the last year, laid out as weeks (Monday first) for a calendar grid. */
export interface Heatmap {
  weeks: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4; future: boolean }[][]
  activeDays: number
  total: number
  longestStreak: number
}

const DAY = 86_400_000

export function heatmap(timestamps: readonly Date[], now: Date, weeks = 53): Heatmap {
  const counts = new Map<string, number>()
  for (const t of timestamps) counts.set(localDate(t), (counts.get(localDate(t)) ?? 0) + 1)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  // Start on the Monday `weeks` weeks back.
  const offset = (today.getDay() + 6) % 7
  const start = new Date(today.getTime() - (offset + (weeks - 1) * 7) * DAY)
  const days: { date: string; count: number }[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start.getTime() + i * DAY)
    days.push({ date: localDate(d), count: d <= today ? (counts.get(localDate(d)) ?? 0) : 0 })
  }
  // Levels by quartiles of active days, so a heavy week doesn't wash out the rest.
  const active = days.map((d) => d.count).filter((c) => c > 0).sort((a, b) => a - b)
  const q = (p: number) => active[Math.floor(p * (active.length - 1))] ?? 1
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)]
  const level = (c: number): Heatmap['weeks'][number][number]['level'] => (c === 0 ? 0 : c <= q1 ? 1 : c <= q2 ? 2 : c <= q3 ? 3 : 4)
  const todayKey = localDate(today)
  let streak = 0
  let longest = 0
  for (const d of days) {
    if (d.date > todayKey) break
    streak = d.count > 0 ? streak + 1 : 0
    longest = Math.max(longest, streak)
  }
  const cells = days.map((d) => ({ ...d, level: level(d.count), future: d.date > todayKey }))
  return {
    weeks: Array.from({ length: weeks }, (_, w) => cells.slice(w * 7, w * 7 + 7)),
    activeDays: active.length,
    total: active.reduce((a, b) => a + b, 0),
    longestStreak: longest,
  }
}
