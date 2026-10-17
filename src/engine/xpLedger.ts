/**
 * XP that does not come from an answer: time read or listened, lessons of the guide learned. An answer's XP is
 * worked out again from the history every time, but these have no such history to work from (the time log keeps
 * only a few months, a lesson can be unmarked and read again), so each award is written down once, under a key
 * that names it, and only ever grows. A device syncing brings the union of the awards.
 */
export interface XpAward {
  /** The local day it was earned. */
  day: string
  xp: number
}
export type XpLedger = Record<string, XpAward>

/** Active reading and listening: this much time earns this many points, up to the cap a day (all languages together). */
export const TIME_STEP_SECONDS = 300
export const TIME_STEP_XP = 5
export const TIME_DAY_CAP = 30
/** A lesson learned (its check passed), once ever; each review step passed; every lesson of a level learned. */
export const LESSON_XP = 20
export const REVIEW_XP = 10
export const CERT_XP = 100

export const timeXp = (seconds: number): number => Math.min(TIME_DAY_CAP, Math.floor(Math.max(0, seconds) / TIME_STEP_SECONDS) * TIME_STEP_XP)

export const timeAwardKey = (day: string) => `time|${day}`
export const lessonAwardKey = (topic: string) => `lesson|${topic}`
export const reviewAwardKey = (topic: string, step: number) => `review|${topic}|${step}`
export const certAwardKey = (language: string, level: string) => `cert|${language}|${level}`

/** The ledger with the award in it: a key already there keeps its day and never goes down (a new object; the same one when nothing changed). */
export function award(ledger: XpLedger, key: string, day: string, xp: number): XpLedger {
  if (!Number.isFinite(xp) || xp <= 0) return ledger
  const have = ledger[key]
  if (have && have.xp >= xp) return ledger
  return { ...ledger, [key]: { day: have?.day ?? day, xp: Math.round(xp) } }
}

/** Two devices' ledgers: every key from either side, the larger points and the earlier day. */
export function mergeLedgers(a: XpLedger | undefined, b: XpLedger | undefined): XpLedger {
  const out: XpLedger = { ...a }
  for (const [key, other] of Object.entries(b ?? {})) {
    const have = out[key]
    out[key] = have ? { day: have.day <= other.day ? have.day : other.day, xp: Math.max(have.xp, other.xp) } : other
  }
  return out
}

const KEY = /^(?:time\|\d{4}-\d{2}-\d{2}|lesson\|[\w-]+|review\|[\w-]+\|\d|cert\|(?:en|fr|es)\|[A-C][12])$/

/** Only awards of a known kind with a day and sensible points survive (a hand-edited or damaged backup). */
export function cleanLedger(raw: unknown): XpLedger {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: XpLedger = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const v = value as Partial<XpAward> | null
    if (KEY.test(key) && v && typeof v.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.day) && typeof v.xp === 'number' && Number.isFinite(v.xp) && v.xp > 0 && v.xp <= 1000) out[key] = { day: v.day, xp: Math.round(v.xp) }
  }
  return out
}

/** The points of each day. */
export function ledgerByDay(ledger: XpLedger | undefined): Map<string, number> {
  const days = new Map<string, number>()
  for (const { day, xp } of Object.values(ledger ?? {})) days.set(day, (days.get(day) ?? 0) + xp)
  return days
}
