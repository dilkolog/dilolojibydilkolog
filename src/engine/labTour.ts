import { dueItems, labKey, MASTERY_MAX, tallyCells, type LabData } from './labProgress'
import type { Tense } from './tenses'

/**
 * The day's verb round: one button instead of choosing among tabs, tenses and modes. The learner's
 * own queue first (forms whose review is due), then the persons they miss most, then today's verb in
 * the core tenses; at most three verbs, about three minutes. Each form is asked the way its
 * mastery calls for: recognised among four while new, written once it is known a little, written
 * into a real sentence once it is known well.
 */
export type TourKind = 'choose' | 'type' | 'sentence'
export type TourReason = 'due' | 'weak' | 'new'

export interface TourItem {
  verb: string
  tense: Tense
  person: number
  kind: TourKind
  reason: TourReason
}

export interface TourInput {
  lab: LabData
  now: Date
  /** Today's verb (see useVerbOfDay): new forms come from it. */
  verbOfDay?: string
  /** The core tenses, in teaching order (present first). */
  core: readonly Tense[]
  /** The persons a tense has and that are asked (vosotros left out when hidden). */
  persons: (verb: string, tense: Tense) => readonly number[]
  /** The verb has a table for the tense. */
  has: (verb: string, tense: Tense) => boolean
  /** A number for the day (20261008): the same round all day, another tomorrow. */
  day: number
}

export const TOUR_SIZE = 12
const MAX_VERBS = 3
const MAX_DUE = 6
const MAX_WEAK = 3
const NEW_TENSES = 2

/** The way to ask a form, from its mastery points (0–60). */
export function kindFor(points: number | undefined): TourKind {
  if (!points || points < MASTERY_MAX / 3) return 'choose'
  if (points < (MASTERY_MAX * 2) / 3) return 'type'
  return 'sentence'
}

const hash = (s: string, day: number) => {
  let h = day >>> 0
  for (const ch of s) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0
  return h
}

export function buildTour(input: TourInput, size = TOUR_SIZE): TourItem[] {
  const { lab, now, verbOfDay, core, persons, has, day } = input
  const out: TourItem[] = []
  const verbs = new Set<string>()
  const seen = new Set<string>()
  const fits = (verb: string) => verbs.has(verb) || verbs.size < MAX_VERBS
  const push = (verb: string, tense: Tense, person: number, reason: TourReason, kind?: TourKind) => {
    const key = `${verb}|${tense}|${person}`
    if (out.length >= size || seen.has(key) || !fits(verb) || !has(verb, tense)) return false
    seen.add(key)
    verbs.add(verb)
    out.push({ verb, tense, person, reason, kind: kind ?? kindFor(lab.records[labKey(verb, tense)]?.points) })
    return true
  }
  const personOf = (verb: string, tense: Tense, salt: number) => {
    const list = persons(verb, tense)
    return list.length ? list[hash(`${verb}|${tense}|${salt}`, day) % list.length] : undefined
  }

  // 1. The queue: forms whose review is due, most overdue first; a person each, varied by day.
  let due = 0
  for (const item of dueItems(lab, now)) {
    if (due >= MAX_DUE) break
    const person = personOf(item.verb, item.tense, 0)
    if (person !== undefined && push(item.verb, item.tense, person, 'due')) due++
  }

  // 2. The persons missed most (any verb), asked on a verb already in the round (or today's verb).
  const weakCells = tallyCells(lab)
    .filter((c) => c.wrong >= 2 && c.rate >= 1 / 3)
    .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong)
  let weak = 0
  for (const cell of weakCells) {
    if (weak >= MAX_WEAK) break
    const verb = [...verbs, verbOfDay].find((v): v is string => !!v && has(v, cell.tense) && persons(v, cell.tense).includes(cell.person))
    // A weak spot is written, not picked: that is where the slips happen.
    if (verb && push(verb, cell.tense, cell.person, 'weak', 'type')) weak++
  }

  // 3. Today's verb: its first two tenses (in teaching order) not yet known well, three persons
  //    each, the first ones picked among four and the last one written, so a new form is met
  //    before it is produced. Two tenses at most: a new verb in four tenses at once is a blur.
  if (verbOfDay) {
    const open = core.filter((t) => has(verbOfDay, t) && kindFor(lab.records[labKey(verbOfDay, t)]?.points) !== 'sentence')
    for (const tense of (open.length ? open : core).slice(0, NEW_TENSES)) {
      if (out.length >= size) break
      const known = kindFor(lab.records[labKey(verbOfDay, tense)]?.points)
      const list = persons(verbOfDay, tense)
      const start = hash(`${verbOfDay}|${tense}`, day) % Math.max(1, list.length)
      const three = [0, 1, 2].map((i) => list[(start + i * 2) % list.length]).filter((p, i, a) => p !== undefined && a.indexOf(p) === i)
      three.forEach((person, i) => push(verbOfDay, tense, person, 'new', known === 'choose' && i < 2 ? 'choose' : known === 'choose' ? 'type' : known))
    }
  }
  return out
}

/** Verbs of a round, in the order they first come. */
export const tourVerbs = (items: readonly TourItem[]) => [...new Set(items.map((i) => i.verb))]
