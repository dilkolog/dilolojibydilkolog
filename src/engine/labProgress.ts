import { Rating, type Card } from 'ts-fsrs'
import type { Scheduler } from './scheduler'
import type { Tense } from './tenses'

/**
 * What the verb lab remembers: the verbs starred, the ones looked at last, and for each verb and
 * tense how the practice went. Every verb-and-tense pair is a card in the same FSRS scheduler as
 * the words, so what is due comes back when it is about to be forgotten, not on a fixed ladder.
 */
export interface LabRecord {
  ok: number
  wrong: number
  /** Mastery points, 0 to MASTERY_MAX: +10 for a right answer or round, -10 for a wrong one. */
  points: number
  card: Card
}

export interface LabData {
  favorites: string[]
  recent: string[]
  records: Record<string, LabRecord>
}

export const MASTERY_MAX = 60
const STEP = 10
const RECENT_MAX = 12

export const emptyLab = (): LabData => ({ favorites: [], recent: [], records: {} })

export const labKey = (verb: string, tense: Tense) => `${verb}|${tense}`

export function toggleFavorite(lab: LabData, verb: string): LabData {
  return { ...lab, favorites: lab.favorites.includes(verb) ? lab.favorites.filter((v) => v !== verb) : [verb, ...lab.favorites] }
}

/** The verb moves to the front of the recent ones, which keep only the last few. */
export function pushRecent(lab: LabData, verb: string): LabData {
  return lab.recent[0] === verb ? lab : { ...lab, recent: [verb, ...lab.recent.filter((v) => v !== verb)].slice(0, RECENT_MAX) }
}

const dueOf = (r: LabRecord) => new Date(r.card.due)

const bump = (points: number, ok: boolean) => Math.max(0, Math.min(MASTERY_MAX, points + (ok ? STEP : -STEP)))

/** One form asked and answered (the review queue): right is Good, wrong is Again. */
export function recordCheck(lab: LabData, scheduler: Scheduler, verb: string, tense: Tense, ok: boolean, now: Date): LabData {
  const key = labKey(verb, tense)
  const before = lab.records[key] ?? { ok: 0, wrong: 0, points: 0, card: scheduler.newCard(now) }
  const record: LabRecord = {
    ok: before.ok + (ok ? 1 : 0),
    wrong: before.wrong + (ok ? 0 : 1),
    points: bump(before.points, ok),
    card: scheduler.review(before.card, ok ? Rating.Good : Rating.Again, now),
  }
  return { ...lab, records: { ...lab.records, [key]: record } }
}

/**
 * A whole round of a tense (all its persons): all right is Good, one slip Hard, more Again. A round
 * with at most one slip counts as right for the points.
 */
export function recordRound(lab: LabData, scheduler: Scheduler, verb: string, tense: Tense, result: { correct: number; total: number }, now: Date): LabData {
  const key = labKey(verb, tense)
  const before = lab.records[key] ?? { ok: 0, wrong: 0, points: 0, card: scheduler.newCard(now) }
  const missed = result.total - result.correct
  const grade = missed === 0 ? Rating.Good : missed === 1 ? Rating.Hard : Rating.Again
  const ok = result.total > 0 && result.correct / result.total >= 0.8
  const record: LabRecord = {
    ok: before.ok + result.correct,
    wrong: before.wrong + missed,
    points: bump(before.points, ok),
    card: scheduler.review(before.card, grade, now),
  }
  return { ...lab, records: { ...lab.records, [key]: record } }
}

/** Puts forms in the review queue without practising them: new cards, due now. */
export function addToReview(lab: LabData, scheduler: Scheduler, verb: string, tenses: readonly Tense[], now: Date): LabData {
  const records = { ...lab.records }
  for (const t of tenses) {
    const key = labKey(verb, t)
    if (!records[key]) records[key] = { ok: 0, wrong: 0, points: 0, card: scheduler.newCard(now) }
  }
  return { ...lab, records }
}

/** Records saved before cards existed get one, due now (they were practised, so they are worth a look). */
export function adoptCards(lab: LabData, scheduler: Scheduler, now: Date): LabData {
  if (Object.values(lab.records).every((r) => r.card)) return lab
  const records = Object.fromEntries(Object.entries(lab.records).map(([k, r]) => [k, r.card ? r : { ...r, card: scheduler.newCard(now) }]))
  return { ...lab, records }
}

export interface LabItem {
  verb: string
  tense: Tense
  record: LabRecord
}

const items = (lab: LabData): LabItem[] =>
  Object.entries(lab.records)
    .filter(([, record]) => record.card)
    .map(([key, record]) => {
      const [verb, tense] = key.split('|')
      return { verb, tense: tense as Tense, record }
    })

/** What is due now or overdue, the most overdue first. */
export function dueItems(lab: LabData, now: Date): LabItem[] {
  return items(lab)
    .filter((i) => dueOf(i.record) <= now)
    .sort((a, b) => dueOf(a.record).getTime() - dueOf(b.record).getTime())
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

/** The growth stage (0 to 5) of a form's plant, from its points. */
export const plantStage = (points: number): 0 | 1 | 2 | 3 | 4 | 5 => Math.min(5, Math.floor((points / MASTERY_MAX) * 5.99)) as 0 | 1 | 2 | 3 | 4 | 5

/** How well the verb is known across the tenses asked: the share of the possible points. */
export function verbMastery(lab: LabData, verb: string, tenses: readonly Tense[]): number {
  if (!tenses.length) return 0
  const total = tenses.reduce((sum, t) => sum + (lab.records[labKey(verb, t)]?.points ?? 0), 0)
  return Math.round((total / (tenses.length * MASTERY_MAX)) * 100)
}

/** Every verb practised, with how well it is known and whether something of it is due: the verb garden. */
export function gardenVerbs(lab: LabData, now: Date): { verb: string; points: number; forms: number; due: number; percent: number }[] {
  const by = new Map<string, { points: number; forms: number; due: number }>()
  for (const i of items(lab)) {
    const g = by.get(i.verb) ?? { points: 0, forms: 0, due: 0 }
    g.points += i.record.points
    g.forms++
    if (dueOf(i.record) <= now) g.due++
    by.set(i.verb, g)
  }
  return [...by.entries()]
    .map(([verb, g]) => ({ verb, ...g, percent: Math.round((g.points / (g.forms * MASTERY_MAX)) * 100) }))
    .sort((a, b) => b.percent - a.percent || a.verb.localeCompare(b.verb))
}

/** Verb-and-tense pairs with full points, for the badges. */
export const masteredForms = (lab: LabData): number => items(lab).filter((i) => i.record.points >= MASTERY_MAX).length
