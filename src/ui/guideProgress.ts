import { afterCheck, putOff, type GuideMarks } from '../engine/guideReview'
import { localDate } from '../engine/progress'

/** The guide's lessons read, learned and reviewed, on this device. */
const KEY = 'diloloji:guide-progress'
/** The first version kept only which lessons were read. */
const OLD_KEY = 'diloloji:guide-read'

export function loadMarks(): GuideMarks {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as GuideMarks
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? '[]') as unknown
    // Lessons read before the dates were kept count as read today: their first review is in a few days.
    if (Array.isArray(old)) return Object.fromEntries(old.filter((t): t is string => typeof t === 'string').map((t) => [t, { read: localDate(new Date()) }]))
  } catch {
    // Unreadable: start over.
  }
  return {}
}

export function saveMarks(marks: GuideMarks): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(marks))
  } catch {
    // Not remembered on this device.
  }
}

/** Marks a lesson read (or not): unmarking forgets its check too. */
export function markRead(marks: GuideMarks, topic: string, on: boolean): GuideMarks {
  const next = { ...marks }
  if (on) next[topic] = next[topic] ?? { read: localDate(new Date()) }
  else delete next[topic]
  return next
}

/** After the lesson's check: read in any case, learned (and a step on) when it went well. */
export const markChecked = (marks: GuideMarks, topic: string, passed: boolean): GuideMarks => ({ ...marks, [topic]: afterCheck(marks[topic], passed, localDate(new Date())) })

/** The review on Today put off: asked again after the same wait. */
export const markPutOff = (marks: GuideMarks, topic: string): GuideMarks => (marks[topic] ? { ...marks, [topic]: putOff(marks[topic]!, localDate(new Date())) } : marks)
