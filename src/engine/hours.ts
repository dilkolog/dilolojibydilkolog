import type { ReviewEvent } from './types'

/**
 * Accuracy by time of day. Memory and attention follow a daily rhythm that differs from person to
 * person (time-of-day / synchrony effect, May & Hasher 1998); the learner's own answers show when
 * they recall best, which is the best time for the daily reminder.
 */
export interface HourBucket {
  /** Start hour (local), inclusive; the bucket spans `span` hours. */
  from: number
  span: number
  label: string
  total: number
  correct: number
  accuracy: number
  /** Median answer time in ms. */
  medianMs: number
}

const BUCKETS: [number, number][] = [
  [6, 3],
  [9, 3],
  [12, 3],
  [15, 3],
  [18, 3],
  [21, 3],
  [0, 6],
]
/** Fewer answers than this in a bucket say nothing reliable. */
export const MIN_ANSWERS = 30

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

export function hourBuckets(events: readonly ReviewEvent[], now: Date, days = 90): HourBucket[] {
  const since = now.getTime() - days * 86_400_000
  const real = events.filter((e) => e.mode === 'normal' && new Date(e.timestamp).getTime() >= since)
  return BUCKETS.map(([from, span]) => {
    const inside = real.filter((e) => {
      const h = new Date(e.timestamp).getHours()
      return h >= from && h < from + span
    })
    const correct = inside.filter((e) => e.verdict === 'correct').length
    return {
      from,
      span,
      label: `${String(from).padStart(2, '0')}–${String((from + span) % 24).padStart(2, '0')}`,
      total: inside.length,
      correct,
      accuracy: inside.length ? correct / inside.length : 0,
      medianMs: median(inside.map((e) => e.responseMs)),
    }
  })
}

export interface HourAdvice {
  best: HourBucket
  worst: HourBucket
  /** A reminder time inside the best daytime bucket ("HH:MM"). */
  reminder: string
}

/**
 * The best and worst buckets with enough answers, and a reminder time in the best one. Needs at
 * least two comparable buckets and a real difference (3 points), otherwise there's no advice.
 */
export function hourAdvice(buckets: readonly HourBucket[]): HourAdvice | null {
  const usable = buckets.filter((b) => b.total >= MIN_ANSWERS)
  if (usable.length < 2) return null
  const sorted = [...usable].sort((a, b) => b.accuracy - a.accuracy)
  const best = sorted[0]
  const worst = sorted.at(-1)!
  if (best.accuracy - worst.accuracy < 0.03) return null
  // Night isn't a reminder time; take the best daytime bucket for that.
  const day = sorted.find((b) => b.from >= 6) ?? best
  const hour = day.from === 21 ? 21 : day.from + 1
  return { best, worst, reminder: `${String(hour).padStart(2, '0')}:${day.from === 21 ? '30' : '00'}` }
}
