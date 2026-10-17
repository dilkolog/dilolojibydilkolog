/**
 * The guide's lessons over time: read, then learned once their short check goes well, then asked
 * again a few days later (3, 10 and 30 days), like a word that is coming back. A failed check starts
 * the steps over. Kept per lesson (its topic, which is unique across the languages).
 */
export interface LessonMark {
  /** Local date (YYYY-MM-DD) the lesson was marked read or first passed; empty once it was unmarked (see `off`). */
  read: string
  /** The day the lesson was marked unread: kept so that sync does not bring the mark back from another device. */
  off?: string
  /** When its check first went well. */
  learned?: string
  /** The last time it was checked again, or put off. */
  reviewed?: string
  /** How many review steps are behind it (0 to REVIEW_DAYS.length). */
  step?: number
  /** The learner's own flag: a bookmark, or "found it hard" (which brings the reviews sooner). */
  flag?: LessonFlag
  /** The day the flag was set or taken off (a mark without a flag but with this day means it was taken off). */
  flagAt?: string
}

export type LessonFlag = 'star' | 'hard'

export type GuideMarks = Record<string, LessonMark>

/** Days after the last look before a lesson is asked again, by step. */
export const REVIEW_DAYS = [3, 10, 30]
/** A check goes well with this many of its questions right (of three). */
export const PASS_RIGHT = 2

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** The day the lesson comes back, or null when it is done with (every step taken) or not read. */
export function reviewDay(mark: LessonMark | undefined): string | null {
  if (!mark?.read) return null
  const step = mark.step ?? 0
  if (step >= REVIEW_DAYS.length) return null
  // A lesson found hard comes back in half the time.
  const wait = REVIEW_DAYS[step]!
  return addDays(mark.reviewed ?? mark.learned ?? mark.read, mark.flag === 'hard' ? Math.max(1, Math.ceil(wait / 2)) : wait)
}

/** Of the lessons that can be checked, the one waiting longest for its review today; null when none waits. */
export function dueLesson(marks: GuideMarks, checkable: string[], today: string): string | null {
  let best: { topic: string; day: string } | null = null
  for (const topic of checkable) {
    const day = reviewDay(marks[topic])
    if (day && day <= today && (!best || day < best.day)) best = { topic, day }
  }
  return best?.topic ?? null
}

/** The lesson after its check: passed moves a step on (and counts as learned), failed starts over. */
export function afterCheck(mark: LessonMark | undefined, passed: boolean, today: string): LessonMark {
  // Unmarked lessons start over: the mark is read again, the old check is not.
  const base: LessonMark = mark?.read ? mark : { ...flagOf(mark), read: today }
  if (!passed) return { ...base, reviewed: today, step: 0 }
  // The first pass is the learning itself, not a review: the steps start from it.
  if (!base.learned) return { ...base, learned: today, reviewed: today, step: 0 }
  return { ...base, reviewed: today, step: (base.step ?? 0) + 1 }
}

/** Put off for now: asked again after the same wait, counted from today. */
export const putOff = (mark: LessonMark, today: string): LessonMark => ({ ...mark, reviewed: today })

/** Whether the lesson counts as read: marked, and not unmarked since. */
export const isRead = (mark: LessonMark | undefined): boolean => !!mark?.read

/** The latest day anything happened to the lesson (reading, checking, unmarking; the flag has its own day). */
const lastTouched = (m: LessonMark): string => [m.read, m.learned, m.reviewed, m.off].filter((d): d is string => !!d).sort().pop() ?? ''

/** The marks of two devices (or the stored and the new ones): per lesson the one touched last; on the same day the further on, else `b`. `newest`: `b` is what the learner just did on this device, so on the same day it wins whatever the step (an unmarking, or a failed check, the same day as the mark it undoes). */
export function mergeMarks(a: GuideMarks | undefined, b: GuideMarks | undefined, { newest = false }: { newest?: boolean } = {}): GuideMarks {
  const out: GuideMarks = {}
  for (const topic of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
    const x = a?.[topic]
    const y = b?.[topic]
    if (!x || !y) {
      out[topic] = (x ?? y)!
      continue
    }
    // The flag is its own thing: it goes by the day it was set, whichever mark the rest comes from.
    const flagFrom = (y.flagAt ?? '') >= (x.flagAt ?? '') ? y : x
    const dx = lastTouched(x)
    const dy = lastTouched(y)
    // The same day: the further on wins, else the later argument (what was just done to the lesson).
    const winner = dx !== dy ? (dx > dy ? x : y) : !newest && (x.step ?? -1) > (y.step ?? -1) ? x : y
    const { flag: _f, flagAt: _a, ...rest } = winner
    out[topic] = { ...rest, ...(flagFrom.flagAt ? { flagAt: flagFrom.flagAt } : {}), ...(flagFrom.flag ? { flag: flagFrom.flag } : {}) }
  }
  return out
}

/** Marks as they come from storage or a backup: only well-shaped lessons are kept (a bad entry must not break the screen). */
export function cleanMarks(raw: unknown): GuideMarks {
  const out: GuideMarks = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)
  for (const [topic, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue
    const m = v as Record<string, unknown>
    const read = m.read === '' ? '' : day(m.read)
    if (read === undefined) continue
    const mark: LessonMark = { read }
    for (const key of ['off', 'learned', 'reviewed'] as const) {
      const d = day(m[key])
      if (d) mark[key] = d
    }
    const flagAt = day(m.flagAt)
    if (flagAt) {
      mark.flagAt = flagAt
      if (m.flag === 'star' || m.flag === 'hard') mark.flag = m.flag
    }
    if (typeof m.step === 'number' && Number.isFinite(m.step) && m.step >= 0) mark.step = Math.min(Math.floor(m.step), REVIEW_DAYS.length)
    out[topic] = mark
  }
  return out
}

/** Only the flag of a mark: what stays when the rest of the mark starts over. */
export const flagOf = (mark: LessonMark | undefined): Pick<LessonMark, 'flag' | 'flagAt'> => (mark?.flagAt ? { flagAt: mark.flagAt, ...(mark.flag ? { flag: mark.flag } : {}) } : {})
