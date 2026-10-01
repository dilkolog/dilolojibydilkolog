import type { ErrorType, ExerciseType, Mistake } from './types'

/** Correct answers on the word after the last occurrence before a mistake counts as fixed. */
export const RESOLVE_AFTER_CORRECT = 3

export function mistakeId(entryId: string, errorType: ErrorType, given: string): string {
  return `${entryId}|${errorType}|${given}`
}

export interface MistakeInput {
  entryId: string
  errorType: ErrorType
  exerciseType: ExerciseType
  given: string
  expected: string
  at: Date
  highConfidence?: boolean
}

/** Returns a new array; the same error repeated is merged and re-opened rather than duplicated. */
export function recordMistake(bank: readonly Mistake[], m: MistakeInput): Mistake[] {
  const id = mistakeId(m.entryId, m.errorType, m.given)
  const existing = bank.find((x) => x.id === id)
  if (existing) {
    return bank.map((x) =>
      x.id === id
        ? { ...x, count: x.count + 1, lastAt: m.at, correctSince: 0, resolved: false, exerciseType: m.exerciseType, highConfidence: x.highConfidence || m.highConfidence }
        : x,
    )
  }
  return [
    ...bank,
    { id, ...m, count: 1, firstAt: m.at, lastAt: m.at, correctSince: 0, resolved: false },
  ]
}

export function recordCorrect(bank: readonly Mistake[], entryId: string): Mistake[] {
  return bank.map((x) => {
    if (x.entryId !== entryId || x.resolved) return x
    const correctSince = x.correctSince + 1
    return { ...x, correctSince, resolved: correctSince >= RESOLVE_AFTER_CORRECT }
  })
}

export function openMistakes(bank: readonly Mistake[], entryId?: string): Mistake[] {
  return bank.filter((x) => !x.resolved && (entryId === undefined || x.entryId === entryId))
}
