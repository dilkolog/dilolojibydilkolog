import { isRead, type GuideMarks } from './guideReview'
import { weekStartOf } from './friendLeague'

/** Lessons per week to choose from (absent or 0: no goal). */
export const GUIDE_GOAL_CHOICES = [1, 2, 3, 5]

/** Reading speed for a lesson, in words a minute (slower than a story: rules and tables are studied). */
const WORDS_PER_MINUTE = 110
/** The three questions at the end of a lesson. */
const CHECK_MINUTES = 1

/** The lessons marked read from the Monday of this week to today. */
export function lessonsThisWeek(marks: GuideMarks, today: string): number {
  const start = weekStartOf(today)
  return Object.values(marks).filter((m) => isRead(m) && m.read >= start && m.read <= today).length
}

/** Whether a lesson was marked read today. */
export const readToday = (marks: GuideMarks, today: string): boolean => Object.values(marks).some((m) => isRead(m) && m.read === today)

interface Readable {
  summary: string
  rules: string[]
  examples: { text: string; tr: string }[]
  watch: string[]
  tip?: string
  table?: { head: string[]; rows: string[][] }
}

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length

/** About how many minutes a lesson takes: its words at a study pace plus the check, never under 2. */
export function lessonMinutes(lesson: Readable): number {
  const texts = [lesson.summary, ...lesson.rules, ...lesson.examples.flatMap((e) => [e.text, e.tr]), ...lesson.watch, lesson.tip ?? '', ...(lesson.table ? [...lesson.table.head, ...lesson.table.rows.flat()] : [])]
  const words = texts.reduce((n, t) => n + wordCount(t), 0)
  return Math.max(2, Math.round(words / WORDS_PER_MINUTE + CHECK_MINUTES))
}
