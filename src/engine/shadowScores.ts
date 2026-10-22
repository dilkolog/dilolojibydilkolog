import type { TargetLanguage } from './types'

/**
 * Shadowing scores per sentence, to show the same sentence a week later against its first try. A score comes from the
 * pronunciation service (only with the learner's own key), so these live on the device and are never synced.
 */

export interface ShadowTry {
  at: string
  score: number
}
export type ShadowLog = Record<string, ShadowTry[]>

/** Tries kept per sentence, and sentences kept in all (the oldest-touched go first). */
export const KEEP_TRIES = 8
export const KEEP_SENTENCES = 300
/** A try this many days older than the latest is "the week before". */
export const WEEK_DAYS = 6

const DAY = 86_400_000

/** A sentence as the key it is kept under: case, accents on the apostrophe, spacing and punctuation do not matter. */
export function shadowKey(language: TargetLanguage, sentence: string): string {
  const text = sentence.normalize('NFC').toLocaleLowerCase(language).replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{N}']+/gu, ' ').trim()
  return `${language}|${text.slice(0, 160)}`
}

export function cleanShadowLog(raw: unknown): ShadowLog {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: ShadowLog = {}
  for (const [key, tries] of Object.entries(raw)) {
    if (!Array.isArray(tries)) continue
    const ok = tries.filter((t): t is ShadowTry => !!t && typeof t.at === 'string' && Number.isFinite(Date.parse(t.at)) && typeof t.score === 'number' && t.score >= 0 && t.score <= 100)
    if (ok.length) out[key] = ok.slice(-KEEP_TRIES)
  }
  return out
}

export function addShadowTry(log: ShadowLog, key: string, score: number, now: Date): ShadowLog {
  const next: ShadowLog = { ...log, [key]: [...(log[key] ?? []), { at: now.toISOString(), score: Math.round(score) }].slice(-KEEP_TRIES) }
  const keys = Object.keys(next)
  if (keys.length <= KEEP_SENTENCES) return next
  // The sentences touched longest ago go.
  const touched = (k: string) => Date.parse(next[k][next[k].length - 1].at)
  for (const k of keys.sort((a, b) => touched(a) - touched(b)).slice(0, keys.length - KEEP_SENTENCES)) delete next[k]
  return next
}

export interface WeekCompare {
  before: ShadowTry
  latest: ShadowTry
  days: number
  /** Points gained since (negative when lower). */
  delta: number
}

/** The latest try against the most recent one at least `WEEK_DAYS` before it, if there is one. */
export function compareWeek(tries: readonly ShadowTry[] | undefined): WeekCompare | null {
  if (!tries || tries.length < 2) return null
  const sorted = [...tries].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const latest = sorted[sorted.length - 1]
  const earlier = sorted.slice(0, -1).filter((t) => Date.parse(latest.at) - Date.parse(t.at) >= WEEK_DAYS * DAY)
  const before = earlier[earlier.length - 1]
  if (!before) return null
  return { before, latest, days: Math.round((Date.parse(latest.at) - Date.parse(before.at)) / DAY), delta: latest.score - before.score }
}

/** The last try before today's, for the line shown before trying again ("last time …"). */
export function lastTry(tries: readonly ShadowTry[] | undefined, now: Date): { try: ShadowTry; days: number } | null {
  if (!tries?.length) return null
  const t = tries[tries.length - 1]
  const days = Math.floor((now.getTime() - Date.parse(t.at)) / DAY)
  return { try: t, days: Math.max(0, days) }
}

const when = (days: number) => (days <= 0 ? 'bugün' : days === 1 ? 'dün' : `${days} gün önce`)

/** The line shown with a sentence's score. */
export function progressLine(tries: readonly ShadowTry[] | undefined): string {
  const week = compareWeek(tries)
  if (!week) return ''
  const { before, latest, delta, days } = week
  const trend = delta > 0 ? `${delta} puan yükseldin` : delta < 0 ? `${-delta} puan düştün` : 'aynı kaldın'
  return `Aynı cümle ${when(days)}: %${before.score}. Şimdi %${latest.score}: ${trend}.`
}

/** Every try so far, first to latest: how a word's melody score moved (the pitch comparison, which needs no key). */
export interface Trend {
  first: ShadowTry
  latest: ShadowTry
  tries: number
  days: number
  delta: number
}

export function trendOf(tries: readonly ShadowTry[] | undefined): Trend | null {
  if (!tries || tries.length < 2) return null
  const sorted = [...tries].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const first = sorted[0]
  const latest = sorted[sorted.length - 1]
  return { first, latest, tries: sorted.length, days: Math.round((Date.parse(latest.at) - Date.parse(first.at)) / DAY), delta: latest.score - first.score }
}

/** The line under a word's melody chart once it was tried more than once. */
export function trendLine(tries: readonly ShadowTry[] | undefined): string {
  const t = trendOf(tries)
  if (!t) return ''
  const since = t.days >= 1 ? ` (${t.days} gün içinde)` : ''
  const move = t.delta > 0 ? `${t.delta} puan yükseldi` : t.delta < 0 ? `${-t.delta} puan düştü` : 'aynı kaldı'
  return `${t.tries} denemede ezgi benzerliğin %${t.first.score} → %${t.latest.score}: ${move}${since}.`
}
