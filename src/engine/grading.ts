import { Rating, type Grade } from 'ts-fsrs'
import type { Confidence, ExerciseType, Verdict } from './types'
import { EXERCISES } from './exercises'

/**
 * Evidence-based grading: the user never self-rates ("I knew it"). The FSRS grade is derived from
 * correctness, response time relative to the exercise's expected time, and hint usage.
 */
export interface GradingInput {
  exerciseType: ExerciseType
  verdict: Verdict
  responseMs: number
  hintsUsed: number
  /** Number of hints the exercise offered; using all of them means the answer was given away. */
  maxHints: number
  confidence?: Confidence
}

/** Slower than this multiple of the expected time = effortful retrieval → Hard. */
export const SLOW_FACTOR = 2.5
/** Faster than this multiple on a typed exercise = fluent retrieval → Easy. */
export const FAST_FACTOR = 0.5

export function gradeAttempt(input: GradingInput): Grade {
  const meta = EXERCISES[input.exerciseType]

  if (input.verdict === 'wrong') return Rating.Again
  // Every hint revealed: the answer was effectively shown, so treat it as a failed retrieval.
  if (input.maxHints > 0 && input.hintsUsed >= input.maxHints) return Rating.Again
  // Near misses (accent, typo, missing article) show the word was retrieved but not precisely.
  if (input.verdict === 'near') return Rating.Hard
  if (input.hintsUsed > 0) return Rating.Hard
  // Right, but the learner wasn't sure: the memory is there but fragile.
  if (input.confidence === 'unsure') return Rating.Hard
  if (input.responseMs > meta.expectedMs * SLOW_FACTOR) return Rating.Hard
  // Multiple choice can be guessed, so speed there is never evidence of strong memory.
  if (meta.input === 'typed' && input.responseMs < meta.expectedMs * FAST_FACTOR) return Rating.Easy
  return Rating.Good
}

/**
 * Share of a word's correct answers that came slowly (beyond SLOW_FACTOR × the exercise's
 * expected time). Right but slow means the memory is there but fragile: it needs fluency
 * practice, not more learning.
 */
export function slowShare(events: readonly { exerciseType: ExerciseType; verdict: Verdict; responseMs: number; mode?: string }[]): { correct: number; slow: number } {
  let correct = 0
  let slow = 0
  for (const e of events) {
    if (e.verdict === 'wrong' || e.mode === 'practice') continue
    correct++
    if (e.responseMs > EXERCISES[e.exerciseType].expectedMs * SLOW_FACTOR) slow++
  }
  return { correct, slow }
}
