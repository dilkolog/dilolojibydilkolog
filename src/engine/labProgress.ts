import type { Tense } from './tenses'

/**
 * What the verb lab remembers: the verbs starred, the ones looked at last, and for each verb and
 * tense how the practice went. A small Leitner box schedules the "today's reviews": a right
 * answer moves a form to the next box (longer wait), a wrong one back to the first.
 */
export interface LabRecord {
  ok: number
  wrong: number
  /** Leitner box, 0 (new or just missed) to 4 (known well). */
  box: number
  /** The day it is due again (days since 1970). */
  due: number
  /** Mastery points, 0 to MASTERY_MAX: +10 for a right answer, -10 for a wrong one. */
  points: number
}

export interface LabData {
  favorites: string[]
  recent: string[]
  records: Record<string, LabRecord>
}

export const MASTERY_MAX = 60
const STEP = 10
/** Days to wait after landing in each box. */
const WAIT = [0, 1, 3, 7, 21]
const RECENT_MAX = 12

export const emptyLab = (): LabData => ({ favorites: [], recent: [], records: {} })

export const labKey = (verb: string, tense: Tense) => `${verb}|${tense}`
const dayOf = (now: number) => Math.floor(now / 86_400_000)

export function toggleFavorite(lab: LabData, verb: string): LabData {
  return { ...lab, favorites: lab.favorites.includes(verb) ? lab.favorites.filter((v) => v !== verb) : [verb, ...lab.favorites] }
}

/** The verb moves to the front of the recent ones, which keep only the last few. */
export function pushRecent(lab: LabData, verb: string): LabData {
  return lab.recent[0] === verb ? lab : { ...lab, recent: [verb, ...lab.recent.filter((v) => v !== verb)].slice(0, RECENT_MAX) }
}

export function recordAnswer(lab: LabData, verb: string, tense: Tense, ok: boolean, now: number): LabData {
  const key = labKey(verb, tense)
  const before = lab.records[key] ?? { ok: 0, wrong: 0, box: 0, due: dayOf(now), points: 0 }
  const box = ok ? Math.min(WAIT.length - 1, before.box + 1) : 0
  const next: LabRecord = {
    ok: before.ok + (ok ? 1 : 0),
    wrong: before.wrong + (ok ? 0 : 1),
    box,
    due: dayOf(now) + WAIT[box],
    points: Math.max(0, Math.min(MASTERY_MAX, before.points + (ok ? STEP : -STEP))),
  }
  return { ...lab, records: { ...lab.records, [key]: next } }
}

export interface LabItem {
  verb: string
  tense: Tense
  record: LabRecord
}

const items = (lab: LabData): LabItem[] =>
  Object.entries(lab.records).map(([key, record]) => {
    const [verb, tense] = key.split('|')
    return { verb, tense: tense as Tense, record }
  })

/** What is due today or overdue, the most overdue first. */
export function dueItems(lab: LabData, now: number): LabItem[] {
  const today = dayOf(now)
  return items(lab)
    .filter((i) => i.record.due <= today)
    .sort((a, b) => a.record.due - b.record.due)
}

/** What went wrong more than right and is not yet known well: "Zorlandıklarım". */
export function difficultItems(lab: LabData): LabItem[] {
  return items(lab)
    .filter((i) => i.record.wrong > 0 && i.record.points < MASTERY_MAX / 2 && i.record.wrong >= i.record.ok / 2)
    .sort((a, b) => b.record.wrong - a.record.wrong)
}

export type MasteryLevel = 'new' | 'learning' | 'good' | 'master'

export function masteryLevel(record: LabRecord | undefined): MasteryLevel {
  const p = record?.points ?? 0
  return p === 0 && !(record && record.ok + record.wrong > 0) ? 'new' : p >= MASTERY_MAX ? 'master' : p >= MASTERY_MAX / 2 ? 'good' : 'learning'
}

/** How well the verb is known across the tenses asked: the share of the possible points. */
export function verbMastery(lab: LabData, verb: string, tenses: readonly Tense[]): number {
  if (!tenses.length) return 0
  const total = tenses.reduce((sum, t) => sum + (lab.records[labKey(verb, t)]?.points ?? 0), 0)
  return Math.round((total / (tenses.length * MASTERY_MAX)) * 100)
}
