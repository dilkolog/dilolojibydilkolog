import type { QuizQuestion } from './types'

/** Keeps only well-formed multiple-choice questions: four distinct options and a valid index for the right one. */
export function cleanQuestions(list: readonly QuizQuestion[], count: number): QuizQuestion[] {
  return list
    .filter((q) => q.question.trim() && q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 && new Set(q.options.map((o) => o.trim().toLowerCase())).size === 4)
    .slice(0, count)
}
