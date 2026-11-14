import { examQuestionId, passageShare, type ExamPassage } from './examReading'
import type { ExamTask } from './examTasks'
import type { GrammarLog } from './grammar'
import type { TargetLanguage } from './types'

/** The levels in the order a learner climbs them. */
export const EXAM_LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

/** One exam of a language as its content names it ("DELF", "Cambridge"), with the levels that have something in it. */
export interface ExamFamily {
  exam: string
  levels: string[]
  /** Reading and listening sets plus writing tasks, all levels. */
  count: number
}

const levelRank = (l: string) => {
  const i = (EXAM_LEVEL_ORDER as readonly string[]).indexOf(l)
  return i < 0 ? EXAM_LEVEL_ORDER.length : i
}

/**
 * The exams of a language, read from the content (no exam name is written in code): every `exam` its reading sets
 * or writing tasks carry, the one with the most content first, each with only the levels that have content.
 */
export function examFamilies(language: TargetLanguage, passages: readonly ExamPassage[], tasks: readonly ExamTask[]): ExamFamily[] {
  const byExam = new Map<string, { levels: Set<string>; count: number }>()
  for (const item of [...passages, ...tasks]) {
    if (item.language !== language) continue
    const had = byExam.get(item.exam) ?? { levels: new Set<string>(), count: 0 }
    had.levels.add(item.level)
    had.count++
    byExam.set(item.exam, had)
  }
  return [...byExam]
    .map(([exam, v]) => ({ exam, levels: [...v.levels].sort((a, b) => levelRank(a) - levelRank(b)), count: v.count }))
    .sort((a, b) => b.count - a.count || a.exam.localeCompare(b.exam))
}

/** The reading and listening sets and the writing tasks of one exam and level, in the content's order. */
export function examContent(language: TargetLanguage, exam: string, level: string, passages: readonly ExamPassage[], tasks: readonly ExamTask[]) {
  const fits = (x: { language: TargetLanguage; exam: string; level: string }) => x.language === language && x.exam === exam && x.level === level
  return { passages: passages.filter(fits), tasks: tasks.filter(fits) }
}

/** A saved choice that no longer fits the content (another language's exam, a level emptied) falls back to the first. */
export function pickExam(families: readonly ExamFamily[], saved?: { exam?: string; level?: string }): { exam: string; level: string } | null {
  const family = families.find((f) => f.exam === saved?.exam) ?? families[0]
  if (!family) return null
  const level = family.levels.includes(saved?.level ?? '') ? saved!.level! : family.levels[0]
  return { exam: family.exam, level }
}

/** A set's last result (share of its questions right) and when it was last answered; undefined if never. */
export function passageResult(passage: ExamPassage, log: GrammarLog): { share: number; at?: string } | undefined {
  const share = passageShare(passage, log)
  if (share === undefined) return undefined
  const dates = passage.questions.map((_, i) => log[examQuestionId(passage, i)]?.last).filter((d): d is string => typeof d === 'string' && d.length > 0)
  return { share, at: dates.sort().at(-1) }
}

/** The last time a writing task was written in the journal, with how many corrections it got if it was reviewed. */
export function taskResult(taskId: string, journal: readonly { task?: string; at: string; review?: { mistakes: unknown[] } }[]): { at: string; corrections?: number } | undefined {
  const done = journal.filter((j) => j.task === taskId && typeof j.at === 'string').sort((a, b) => b.at.localeCompare(a.at))[0]
  return done ? { at: done.at, ...(done.review ? { corrections: done.review.mistakes.length } : {}) } : undefined
}
