import type { QuizQuestion } from './types'

/** Keeps only well-formed multiple-choice questions: four distinct options and a valid index for the right one (anything else the model sent is dropped, not trusted). */
export function cleanQuestions(list: readonly QuizQuestion[], count: number): QuizQuestion[] {
  if (!Array.isArray(list)) return []
  return list
    .filter(
      (q) =>
        !!q &&
        typeof q.question === 'string' &&
        q.question.trim() &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((o: unknown) => typeof o === 'string') &&
        Number.isInteger(q.answer) &&
        q.answer >= 0 &&
        q.answer < 4 &&
        new Set(q.options.map((o: string) => o.trim().toLowerCase())).size === 4,
    )
    .slice(0, count)
}
