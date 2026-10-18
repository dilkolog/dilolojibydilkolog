import type { GuideLevel } from '../data/guide/lessonTypes'
import type { KelimeDB } from '../data/db'
import { levelCertificates } from '../engine/guideCertificate'
import { KNOWN_DAY } from '../engine/guidePlacement'
import { afterCheck, cleanMarks, flagOf, isRead, putOff, REVIEW_DAYS, type GuideMarks, type LessonFlag } from '../engine/guideReview'
import { localDate } from '../engine/progress'
import { CERT_XP, certAwardKey, LESSON_XP, lessonAwardKey, REVIEW_XP, reviewAwardKey } from '../engine/xpLedger'

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

/**
 * Marks lessons read that the placement test showed are known: read long ago (`KNOWN_DAY`, so they count for no week) and
 * with every review step behind them (so none comes back to Today). They are not learned: that takes the check, and the XP
 * and the level certificates with it. Lessons already read stay as they are.
 */
export function markKnown(marks: GuideMarks, topics: readonly string[]): GuideMarks {
  const next = { ...marks }
  for (const topic of topics) if (!isRead(next[topic])) next[topic] = { ...flagOf(next[topic]), read: KNOWN_DAY, step: REVIEW_DAYS.length }
  return next
}

/** Takes back `markKnown` for these lessons: the ones still carrying the placement's day are unmarked (the day is kept, so sync carries it). */
export function unmarkKnown(marks: GuideMarks, topics: readonly string[]): GuideMarks {
  const next = { ...marks }
  const today = localDate(new Date())
  for (const topic of topics) if (next[topic]?.read === KNOWN_DAY) next[topic] = { ...flagOf(next[topic]), read: '', off: today }
  return next
}

/** Flags a lesson (a bookmark, or found hard) or takes its flag off; the day is kept either way so that sync carries the change. */
export function markFlag(marks: GuideMarks, topic: string, flag: LessonFlag | null): GuideMarks {
  const { flag: _old, flagAt: _at, ...rest } = marks[topic] ?? { read: '' }
  return { ...marks, [topic]: { ...rest, flagAt: localDate(new Date()), ...(flag ? { flag } : {}) } }
}

/** Saves or clears a personal note on a lesson; the day is kept so sync carries the change. */
export function markNote(marks: GuideMarks, topic: string, note: string): GuideMarks {
  const trimmed = note.trim().slice(0, 1000)
  const { note: _old, noteAt: _at, ...rest } = marks[topic] ?? { read: '' }
  return { ...marks, [topic]: { ...rest, noteAt: localDate(new Date()), ...(trimmed ? { note: trimmed } : {}) } }
}

/** After the lesson's check: read in any case, learned (and a step on) when it went well. */
export const markChecked = (marks: GuideMarks, topic: string, passed: boolean): GuideMarks => ({ ...marks, [topic]: afterCheck(marks[topic], passed, localDate(new Date())) })

/** The review on Today put off: asked again after the same wait. */
export const markPutOff = (marks: GuideMarks, topic: string): GuideMarks => (marks[topic] ? { ...marks, [topic]: putOff(marks[topic]!, localDate(new Date())) } : marks)

/**
 * The XP a finished check earns: the lesson the first time it is learned, a review step each time one is passed,
 * and a level certificate when this check completes the level. Every award has a once-only key (see `xpLedger`),
 * so unmarking and learning a lesson again earns nothing twice.
 */
export function checkAwards(
  language: string,
  lessons: readonly { topic: string; level: GuideLevel }[],
  before: GuideMarks,
  after: GuideMarks,
  topic: string,
  today: string,
): { key: string; day: string; xp: number }[] {
  const out: { key: string; day: string; xp: number }[] = []
  const was = before[topic]
  const now = after[topic]
  if (!now?.learned) return out
  const newlyLearned = !isRead(was) || !was?.learned
  if (newlyLearned) out.push({ key: lessonAwardKey(topic), day: today, xp: LESSON_XP })
  else if (now.step && now.step !== was?.step) out.push({ key: reviewAwardKey(topic, now.step), day: today, xp: REVIEW_XP })
  const doneBefore = new Set(levelCertificates(lessons, before).filter((c) => c.done).map((c) => c.level))
  for (const cert of levelCertificates(lessons, after)) {
    if (cert.done && !doneBefore.has(cert.level)) out.push({ key: certAwardKey(language, cert.level), day: today, xp: CERT_XP })
  }
  return out
}
