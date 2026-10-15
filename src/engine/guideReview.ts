/**
 * The guide's lessons over time: read, then learned once their short check goes well, then asked
 * again a few days later (3, 10 and 30 days), like a word that is coming back. A failed check starts
 * the steps over. Kept per lesson (its topic, which is unique across the languages).
 */
export interface LessonMark {
  /** Local date (YYYY-MM-DD) the lesson was marked read or first passed. */
  read: string
  /** When its check first went well. */
  learned?: string
  /** The last time it was checked again, or put off. */
  reviewed?: string
  /** How many review steps are behind it (0 to REVIEW_DAYS.length). */
  step?: number
}

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
  return addDays(mark.reviewed ?? mark.learned ?? mark.read, REVIEW_DAYS[step]!)
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
  const base: LessonMark = mark ?? { read: today }
  if (!passed) return { ...base, reviewed: today, step: 0 }
  // The first pass is the learning itself, not a review: the steps start from it.
  if (!base.learned) return { ...base, learned: today, reviewed: today, step: 0 }
  return { ...base, reviewed: today, step: (base.step ?? 0) + 1 }
}

/** Put off for now: asked again after the same wait, counted from today. */
export const putOff = (mark: LessonMark, today: string): LessonMark => ({ ...mark, reviewed: today })
