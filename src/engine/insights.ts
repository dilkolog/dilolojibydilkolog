import { localDate } from './progress'
import type { Scheduler } from './scheduler'
import type { ErrorType, ReviewEvent, UserWordState } from './types'

const DAY = 86_400_000
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// ---------------------------------------------------------------------------
// Streak with freezes
// ---------------------------------------------------------------------------

/** Every 7 study days in a row earns one freeze; at most this many are kept. */
export const MAX_FREEZES = 2

export interface StreakState {
  streak: number
  freezes: number
  /** Days that were missed but covered by a freeze. */
  frozenDays: string[]
}

/**
 * Streak where a missed day is covered automatically if a freeze is available. Freezes are
 * earned by keeping a run going, so the safety net rewards consistency instead of replacing it.
 * Today not studied yet doesn't break anything.
 */
export function streakWithFreezes(studyDays: readonly string[], now: Date): StreakState {
  const studied = new Set(studyDays)
  if (studied.size === 0) return { streak: 0, freezes: 0, frozenDays: [] }
  const first = new Date(`${[...studied].sort()[0]}T12:00:00`)
  const today = localDate(now)
  let streak = 0
  let freezes = 0
  let frozenDays: string[] = []
  for (let d = dayStart(first); localDate(d) <= today; d = new Date(d.getTime() + DAY + 3_600_000)) {
    d = dayStart(d)
    const key = localDate(d)
    if (studied.has(key)) {
      streak++
      if (streak % 7 === 0) freezes = Math.min(MAX_FREEZES, freezes + 1)
    } else if (key === today) {
      break
    } else if (freezes > 0 && streak > 0) {
      freezes--
      frozenDays.push(key)
    } else {
      streak = 0
      frozenDays = []
    }
  }
  return { streak, freezes, frozenDays }
}

// ---------------------------------------------------------------------------
// Review forecast
// ---------------------------------------------------------------------------

/** Words coming due on each of the next `days` days (overdue words count on today). */
export function reviewForecast(states: readonly UserWordState[], now: Date, days = 14): { date: string; count: number }[] {
  const start = dayStart(now).getTime()
  const out = Array.from({ length: days }, (_, i) => ({ date: localDate(new Date(start + i * DAY + 3_600_000)), count: 0 }))
  for (const s of states) {
    const dues = Object.values(s.skills).map((c) => c.due.getTime())
    if (!dues.length) continue
    const i = Math.max(0, Math.floor((dayStart(new Date(Math.min(...dues))).getTime() - start) / DAY))
    if (i < days) out[i].count++
  }
  return out
}

// ---------------------------------------------------------------------------
// Hard words and error breakdown
// ---------------------------------------------------------------------------

export interface HardWord {
  entryId: string
  wrong: number
  total: number
  rate: number
}

/** Words missed most often (with at least `minAnswers` answers), worst first. */
export function hardWords(events: readonly ReviewEvent[], limit = 10, minAnswers = 3): HardWord[] {
  const by = new Map<string, { wrong: number; total: number }>()
  for (const e of events) {
    if (e.mode !== 'normal') continue
    const x = by.get(e.entryId) ?? { wrong: 0, total: 0 }
    x.total++
    if (e.verdict === 'wrong') x.wrong++
    by.set(e.entryId, x)
  }
  return [...by.entries()]
    .filter(([, x]) => x.total >= minAnswers && x.wrong > 0)
    .map(([entryId, x]) => ({ entryId, ...x, rate: x.wrong / x.total }))
    .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong)
    .slice(0, limit)
}

export function errorBreakdown(events: readonly ReviewEvent[]): Partial<Record<ErrorType, number>> {
  const out: Partial<Record<ErrorType, number>> = {}
  for (const e of events) {
    if (e.mode !== 'normal' || e.verdict === 'correct' || !e.errorType) continue
    out[e.errorType] = (out[e.errorType] ?? 0) + 1
  }
  return out
}

// ---------------------------------------------------------------------------
// Weekly report
// ---------------------------------------------------------------------------

export interface WeekStats {
  answers: number
  correct: number
  accuracy: number
  xp: number
  newWords: number
  daysStudied: number
}

/** This week (last 7 days incl. today) against the 7 days before. */
export function weekReport(
  events: readonly ReviewEvent[],
  introductions: readonly Date[],
  xpByDay: ReadonlyMap<string, number>,
  now: Date,
): { thisWeek: WeekStats; lastWeek: WeekStats } {
  const start = dayStart(now).getTime() - 6 * DAY
  const week = (from: number): WeekStats => {
    const to = from + 7 * DAY
    const inWeek = (d: Date) => d.getTime() >= from && d.getTime() < to
    const ev = events.filter((e) => e.mode === 'normal' && inWeek(e.timestamp))
    const days = Array.from({ length: 7 }, (_, i) => localDate(new Date(from + i * DAY + 3_600_000)))
    const correct = ev.filter((e) => e.verdict !== 'wrong').length
    return {
      answers: ev.length,
      correct,
      accuracy: ev.length ? correct / ev.length : 0,
      xp: days.reduce((s, d) => s + (xpByDay.get(d) ?? 0), 0),
      newWords: introductions.filter(inWeek).length,
      daysStudied: new Set(ev.map((e) => localDate(e.timestamp))).size,
    }
  }
  return { thisWeek: week(start), lastWeek: week(start - 7 * DAY) }
}

/** The skill with the lowest average recall right now, as a suggested focus. */
export function weakestSkill(profile: Record<string, number | null>): string | null {
  const known = Object.entries(profile).filter((e): e is [string, number] => e[1] !== null)
  return known.length ? known.sort((a, b) => a[1] - b[1])[0][0] : null
}

// ---------------------------------------------------------------------------
// Confidence calibration
// ---------------------------------------------------------------------------

export interface Calibration {
  sure: { answers: number; correct: number }
  unsure: { answers: number; correct: number }
}

/**
 * How well the learner's sense of knowing matches reality. Well calibrated = sure answers are
 * nearly always right and unsure ones clearly less so; overconfidence shows as sure-but-wrong.
 */
export function calibration(events: readonly ReviewEvent[]): Calibration {
  const out: Calibration = { sure: { answers: 0, correct: 0 }, unsure: { answers: 0, correct: 0 } }
  for (const e of events) {
    if (!e.confidence || e.mode !== 'normal') continue
    const c = out[e.confidence]
    c.answers++
    if (e.verdict !== 'wrong') c.correct++
  }
  return out
}

// ---------------------------------------------------------------------------
// Predicted vs actual recall
// ---------------------------------------------------------------------------

export interface RecallBin {
  /** Range of predicted recall probability, e.g. 0.8–0.9. */
  from: number
  to: number
  answers: number
  /** Mean predicted probability in the bin. */
  predicted: number
  /** Share actually recalled. */
  actual: number
}

const BIN_EDGES = [0, 0.5, 0.7, 0.8, 0.9, 0.95, 1.000001]

/**
 * How well the scheduler's predictions match reality: answers grouped by the recall
 * probability FSRS gave them just before, against how often they were actually right.
 * Never-practised skills (no prediction) and practice answers are left out.
 */
export function recallCalibration(events: readonly ReviewEvent[], minAnswers = 5): RecallBin[] {
  const bins = BIN_EDGES.slice(0, -1).map((from, i) => ({ from, to: Math.min(1, BIN_EDGES[i + 1]), answers: 0, p: 0, right: 0 }))
  for (const e of events) {
    if (e.mode !== 'normal' || !(e.retrievabilityBefore > 0)) continue
    const b = bins.find((x, i) => e.retrievabilityBefore >= x.from && e.retrievabilityBefore < BIN_EDGES[i + 1])
    if (!b) continue
    b.answers++
    b.p += e.retrievabilityBefore
    if (e.verdict !== 'wrong') b.right++
  }
  return bins
    .filter((b) => b.answers >= minAnswers)
    .map((b) => ({ from: b.from, to: b.to, answers: b.answers, predicted: b.p / b.answers, actual: b.right / b.answers }))
}

export type { Scheduler }
