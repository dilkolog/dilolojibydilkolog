import { EXERCISES } from './exercises'
import type { ReviewEvent } from './types'

/**
 * How good the memory model's forecasts are, in numbers (docs/KISISEL-ALGORITMA.md): each answer is a forecast (the
 * recall probability FSRS gave just before) and an outcome (right or not).
 *
 * - log loss: the usual score of a probability forecast, lower is better; a forecast that said 90 % and was wrong
 *   is punished far more than one that said 60 %.
 * - Brier score: the mean squared error of the forecast, lower is better.
 * - AUC: the chance that a forecast for an answer that was right is higher than one for an answer that was wrong
 *   (0.5 = no better than a coin, 1 = perfect ranking).
 * - ECE: the average gap between forecast and reality, bin by bin (how far the model is off, whatever the direction).
 * - skill: how much better the log loss is than that of a forecaster who always says the learner's overall average
 *   (0 = adds nothing over knowing the average, 1 = perfect, negative = worse than the average).
 */
export interface ForecastScore {
  n: number
  meanPredicted: number
  meanActual: number
  logLoss: number
  brier: number
  auc: number | null
  ece: number
  skill: number
}

const EPS = 1e-3
const clip = (p: number) => Math.min(1 - EPS, Math.max(EPS, p))

/** AUC by ranks, ties counted half (null when only one outcome occurs). */
export function aucOf(points: readonly { p: number; y: boolean }[]): number | null {
  const pos = points.filter((x) => x.y).length
  const neg = points.length - pos
  if (!pos || !neg) return null
  const sorted = [...points].sort((a, b) => a.p - b.p)
  let rankSum = 0
  for (let i = 0; i < sorted.length; ) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1].p === sorted[i].p) j++
    const rank = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) if (sorted[k].y) rankSum += rank
    i = j + 1
  }
  return (rankSum - (pos * (pos + 1)) / 2) / (pos * neg)
}

/** The scores of a set of answers; null below `min` of them (too few to say anything). */
export function forecastScore(events: readonly ReviewEvent[], min = 20): ForecastScore | null {
  const pts = events.filter((e) => e.retrievabilityBefore > 0 && e.retrievabilityBefore <= 1).map((e) => ({ p: e.retrievabilityBefore, y: e.verdict !== 'wrong' }))
  const n = pts.length
  if (n < min) return null
  const meanActual = pts.filter((x) => x.y).length / n
  const meanPredicted = pts.reduce((s, x) => s + x.p, 0) / n
  const logLoss = pts.reduce((s, x) => s - (x.y ? Math.log(clip(x.p)) : Math.log(1 - clip(x.p))), 0) / n
  const brier = pts.reduce((s, x) => s + (x.p - (x.y ? 1 : 0)) ** 2, 0) / n
  const base = -(meanActual * Math.log(clip(meanActual)) + (1 - meanActual) * Math.log(1 - clip(meanActual)))
  const bins = Array.from({ length: 10 }, () => ({ n: 0, p: 0, y: 0 }))
  for (const x of pts) {
    const b = bins[Math.min(9, Math.floor(x.p * 10))]
    b.n++
    b.p += x.p
    b.y += x.y ? 1 : 0
  }
  const ece = bins.reduce((s, b) => (b.n ? s + (b.n / n) * Math.abs(b.p / b.n - b.y / b.n) : s), 0)
  return { n, meanPredicted, meanActual, logLoss, brier, auc: aucOf(pts), ece, skill: base > 1e-9 ? 1 - logLoss / base : 0 }
}

export interface ForecastReport {
  /** Every scheduled review (the model is asked at the point the schedule picks). */
  scheduled: ForecastScore | null
  /** The same, only the typed questions (a choice has a guessing floor the forecast does not know about). */
  typed: ForecastScore | null
  /** The probes: random cards asked early, in practice mode. */
  probes: ForecastScore | null
}

export function forecastReport(events: readonly ReviewEvent[]): ForecastReport {
  const normal = events.filter((e) => e.mode === 'normal')
  return {
    scheduled: forecastScore(normal),
    typed: forecastScore(normal.filter((e) => EXERCISES[e.exerciseType]?.input !== 'choice')),
    probes: forecastScore(events.filter((e) => e.ctx?.probe !== undefined), 10),
  }
}

/** Plain words for how well a forecast holds, from its skill score. */
export function skillWord(skill: number): string {
  if (skill < 0) return 'ortalamadan bile kötü'
  if (skill < 0.05) return 'ortalamadan pek farklı değil'
  if (skill < 0.2) return 'ortalamadan biraz iyi'
  return 'ortalamadan belirgin iyi'
}
