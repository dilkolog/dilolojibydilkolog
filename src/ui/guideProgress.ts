import type { KelimeDB } from '../data/db'
import { afterCheck, cleanMarks, flagOf, putOff, type GuideMarks, type LessonFlag } from '../engine/guideReview'
import { localDate } from '../engine/progress'

/** Where the first versions kept the marks, on this device only: moved into the database (and so the backup and sync) on first load. */
const KEY = 'diloloji:guide-progress'
/** The very first version kept only which lessons were read. */
const OLD_KEY = 'diloloji:guide-read'

/** The marks kept in this browser by the older versions, if any. */
function oldMarks(): GuideMarks {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return cleanMarks(JSON.parse(raw))
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? '[]') as unknown
    // Lessons read before the dates were kept count as read today: their first review is in a few days.
    if (Array.isArray(old)) return Object.fromEntries(old.filter((t): t is string => typeof t === 'string').map((t) => [t, { read: localDate(new Date()) }]))
  } catch {
    // Unreadable: start over.
  }
  return {}
}

/** The guide's lessons read, learned and reviewed: from the database, after taking in what the older versions kept in the browser. */
export async function loadMarks(db: KelimeDB): Promise<GuideMarks> {
  const old = oldMarks()
  if (!Object.keys(old).length) return db.getGuideMarks()
  // Saved first, forgotten after: a failed save keeps them for the next try.
  const merged = await db.saveGuideMarks(old)
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(OLD_KEY)
  } catch {
    // Left where they are: merging them again changes nothing.
  }
  return merged
}

/** Marks a lesson read (or not): unmarking forgets its check too, and leaves the day so that sync keeps it unmarked. */
export function markRead(marks: GuideMarks, topic: string, on: boolean): GuideMarks {
  const today = localDate(new Date())
  const next = { ...marks }
  if (on) {
    if (!next[topic]?.read) next[topic] = { ...flagOf(next[topic]), read: today }
  } else if (next[topic]) next[topic] = { ...flagOf(next[topic]), read: '', off: today }
  return next
}

/** Flags a lesson (a bookmark, or found hard) or takes its flag off; the day is kept either way so that sync carries the change. */
export function markFlag(marks: GuideMarks, topic: string, flag: LessonFlag | null): GuideMarks {
  const { flag: _old, flagAt: _at, ...rest } = marks[topic] ?? { read: '' }
  return { ...marks, [topic]: { ...rest, flagAt: localDate(new Date()), ...(flag ? { flag } : {}) } }
}

/** After the lesson's check: read in any case, learned (and a step on) when it went well. */
export const markChecked = (marks: GuideMarks, topic: string, passed: boolean): GuideMarks => ({ ...marks, [topic]: afterCheck(marks[topic], passed, localDate(new Date())) })

/** The review on Today put off: asked again after the same wait. */
export const markPutOff = (marks: GuideMarks, topic: string): GuideMarks => (marks[topic] ? { ...marks, [topic]: putOff(marks[topic]!, localDate(new Date())) } : marks)
