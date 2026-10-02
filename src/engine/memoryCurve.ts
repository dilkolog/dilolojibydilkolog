import { forgetting_curve, generatorParameters } from 'ts-fsrs'
import type { ReviewEvent, Skill } from './types'

/**
 * A word's forgetting curve: after each review, recall drops along FSRS's curve with that
 * review's stability; every review lifts it back up, and each time it falls more slowly.
 */
export interface CurvePoint {
  t: number
  r: number
}

export interface MemoryCurve {
  skill: Skill
  points: CurvePoint[]
  reviews: { t: number; r: number; correct: boolean }[]
  /** Where "now" falls (the rest is projection). */
  now: number
}

const DAY = 86_400_000

export function memoryCurve(events: readonly ReviewEvent[], now: Date, horizonDays = 30, weights: readonly number[] = generatorParameters().w): MemoryCurve | null {
  const real = events.filter((e) => e.mode === 'normal').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  if (!real.length) return null
  // The skill with the longest history tells the clearest story.
  const counts = new Map<Skill, number>()
  for (const e of real) counts.set(e.skill, (counts.get(e.skill) ?? 0) + 1)
  const skill = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const list = real.filter((e) => e.skill === skill)

  const end = now.getTime() + horizonDays * DAY
  const start = new Date(list[0].timestamp).getTime()
  const step = Math.max(DAY / 24, (end - start) / 240)
  const points: CurvePoint[] = []
  const reviews: MemoryCurve['reviews'] = []
  list.forEach((e, i) => {
    const t0 = new Date(e.timestamp).getTime()
    const t1 = i + 1 < list.length ? new Date(list[i + 1].timestamp).getTime() : end
    const before = i > 0 ? forgetting_curve([...weights], (t0 - new Date(list[i - 1].timestamp).getTime()) / DAY, Math.max(0.01, list[i - 1].stabilityAfter)) : 0
    reviews.push({ t: t0, r: before, correct: e.verdict !== 'wrong' })
    // The drop just before the review, then the reset to full recall.
    if (i > 0) points.push({ t: t0, r: before })
    for (let t = t0; t < t1; t += step) points.push({ t, r: forgetting_curve([...weights], (t - t0) / DAY, Math.max(0.01, e.stabilityAfter)) })
  })
  const last = list.at(-1)!
  points.push({ t: end, r: forgetting_curve([...weights], (end - new Date(last.timestamp).getTime()) / DAY, Math.max(0.01, last.stabilityAfter)) })
  return { skill, points, reviews, now: now.getTime() }
}
