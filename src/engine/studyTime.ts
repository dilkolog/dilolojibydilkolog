import { localDate } from './progress'
import type { TargetLanguage } from './types'

/**
 * How long the learner read and listened, per language and local day, in seconds. Only the time they
 * were really at it counts (see ui/useStudyClock.ts); the numbers are for a weekly goal and a look
 * at the habit, not for points.
 */
export type TimeKind = 'read' | 'listen'
export type TimeLog = Record<string, number>

/** Days kept: a year's calendar is not needed, a few months of weeks are. */
export const TIME_DAYS_KEPT = 120
/** One report adds at most this many seconds: a clock that jumped (a sleeping laptop) cannot write hours. */
export const MAX_REPORT_SECONDS = 600
/** Weekly goals offered, in minutes. */
export const GOAL_CHOICES = [30, 60, 120, 180] as const

export const timeKey = (kind: TimeKind, language: TargetLanguage, day: string) => `${kind}|${language}|${day}`

/** The log with `seconds` more under that key (a new object). Nonsense (negative, not a number) adds nothing. */
export function addTime(log: TimeLog, kind: TimeKind, language: TargetLanguage, day: string, seconds: number): TimeLog {
  if (!Number.isFinite(seconds) || seconds <= 0) return log
  const key = timeKey(kind, language, day)
  return { ...log, [key]: (log[key] ?? 0) + Math.min(MAX_REPORT_SECONDS, Math.round(seconds)) }
}

/** Two devices' logs: each day keeps the larger number (a day's time is only ever added to, so the larger is the more complete). */
export function mergeTimeLogs(a: TimeLog | undefined, b: TimeLog | undefined): TimeLog {
  const out: TimeLog = { ...a }
  for (const [key, seconds] of Object.entries(b ?? {})) out[key] = Math.max(out[key] ?? 0, seconds)
  return out
}

/** The log without the days older than TIME_DAYS_KEPT before `today`. */
export function pruneTimeLog(log: TimeLog, today: Date): TimeLog {
  const cut = new Date(today)
  cut.setDate(cut.getDate() - TIME_DAYS_KEPT)
  const oldest = localDate(cut)
  return Object.fromEntries(Object.entries(log).filter(([key]) => (key.split('|')[2] ?? '') >= oldest))
}

/** Only numbers made of known parts survive (a hand-edited or damaged backup). */
export function cleanTimeLog(raw: unknown): TimeLog {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: TimeLog = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (/^(read|listen)\|(en|fr|es)\|\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === 'number' && Number.isFinite(value) && value > 0) out[key] = Math.round(value)
  }
  return out
}

export interface TimeDay {
  day: string
  read: number
  listen: number
}
export interface TimeWeek {
  /** The last seven days, today last. */
  days: TimeDay[]
  read: number
  listen: number
  total: number
}

/** The seven days ending today for one language. */
export function weekOf(log: TimeLog, language: TargetLanguage, today: Date): TimeWeek {
  const days: TimeDay[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const day = localDate(d)
    days.push({ day, read: log[timeKey('read', language, day)] ?? 0, listen: log[timeKey('listen', language, day)] ?? 0 })
  }
  const read = days.reduce((n, d) => n + d.read, 0)
  const listen = days.reduce((n, d) => n + d.listen, 0)
  return { days, read, listen, total: read + listen }
}

/** "1 sa 05 dk", "12 dk", "45 sn" (under a minute is shown, so a first minute does not look like nothing). */
export function durationText(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return s === 0 ? '0 dk' : `${s} sn`
  const minutes = Math.round(s / 60)
  if (minutes < 60) return `${minutes} dk`
  const rest = minutes % 60
  return rest ? `${Math.floor(minutes / 60)} sa ${String(rest).padStart(2, '0')} dk` : `${Math.floor(minutes / 60)} sa`
}

/** How far a week's total is to the goal (minutes): 0–1, and whether it is reached. No goal: null. */
export function goalProgress(totalSeconds: number, goalMinutes: number | undefined): { share: number; done: boolean; leftMinutes: number } | null {
  if (!goalMinutes || goalMinutes <= 0) return null
  const share = Math.min(1, totalSeconds / (goalMinutes * 60))
  return { share, done: share >= 1, leftMinutes: Math.max(0, Math.ceil(goalMinutes - totalSeconds / 60)) }
}
