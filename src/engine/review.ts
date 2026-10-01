import { EXERCISES } from './exercises'
import { gradeAttempt } from './grading'
import { recordCorrect, recordMistake } from './mistakes'
import type { Scheduler } from './scheduler'
import type {
  ErrorType,
  ExerciseType,
  Mistake,
  ReviewEvent,
  ReviewMode,
  UserWordState,
  VocabularyEntry,
  Verdict,
} from './types'

export function newWordState(entry: VocabularyEntry, now: Date): UserWordState {
  return {
    entryId: entry.id,
    language: entry.language,
    introducedAt: now,
    skills: {},
    stats: { reviews: 0, correct: 0, wrong: 0, hints: 0, totalResponseMs: 0, consecutiveWrong: 0 },
  }
}

export interface AttemptInput {
  exerciseType: ExerciseType
  verdict: Verdict
  errorType?: ErrorType
  given?: string
  expected?: string
  responseMs: number
  hintsUsed: number
  maxHints: number
  at: Date
  /** 'practice' = low-stakes: logged, but affects neither the schedule nor the Mistake Bank. */
  mode?: ReviewMode
}

export interface ReviewResult {
  state: UserWordState
  event: ReviewEvent
  mistakes: Mistake[]
}

export function processAttempt(
  state: UserWordState,
  input: AttemptInput,
  mistakes: readonly Mistake[],
  scheduler: Scheduler,
  newId: () => string = () => crypto.randomUUID(),
): ReviewResult {
  const meta = EXERCISES[input.exerciseType]
  const mode = input.mode ?? 'normal'
  const now = input.at
  const card = state.skills[meta.skill] ?? scheduler.newCard(now)
  const retrievabilityBefore = scheduler.retrievability(card, now)
  const rating = gradeAttempt(input)
  const correct = input.verdict !== 'wrong'

  let nextState = state
  let nextMistakes = [...mistakes]

  if (mode === 'normal') {
    const nextCard = scheduler.review(card, rating, now)
    const s = state.stats
    nextState = {
      ...state,
      skills: { ...state.skills, [meta.skill]: nextCard },
      lastExerciseType: input.exerciseType,
      lastReviewAt: now,
      stats: {
        reviews: s.reviews + 1,
        correct: s.correct + (correct ? 1 : 0),
        wrong: s.wrong + (correct ? 0 : 1),
        hints: s.hints + input.hintsUsed,
        totalResponseMs: s.totalResponseMs + input.responseMs,
        consecutiveWrong: correct ? 0 : s.consecutiveWrong + 1,
      },
    }
    // Near misses are still logged: an accent or gender slip is exactly what the bank is for.
    if (input.verdict !== 'correct' && input.errorType) {
      nextMistakes = recordMistake(nextMistakes, {
        entryId: state.entryId,
        errorType: input.errorType,
        exerciseType: input.exerciseType,
        given: input.given ?? '',
        expected: input.expected ?? '',
        at: now,
      })
    } else if (input.verdict === 'correct') {
      nextMistakes = recordCorrect(nextMistakes, state.entryId)
    }
  } else {
    nextState = { ...state, lastExerciseType: input.exerciseType }
  }

  const after = nextState.skills[meta.skill] ?? card
  const event: ReviewEvent = {
    id: newId(),
    entryId: state.entryId,
    language: state.language,
    skill: meta.skill,
    exerciseType: input.exerciseType,
    direction: meta.direction,
    verdict: input.verdict,
    correct,
    errorType: input.errorType,
    rating,
    responseMs: input.responseMs,
    hintsUsed: input.hintsUsed,
    given: input.given,
    expected: input.expected,
    retrievabilityBefore,
    stabilityAfter: after.stability,
    scheduledDays: after.scheduled_days,
    mode,
    timestamp: now,
  }
  return { state: nextState, event, mistakes: nextMistakes }
}

/** Earliest due date across practised skills; the word-level "next_review_at". */
export function nextReviewAt(state: UserWordState): Date | undefined {
  const dues = Object.values(state.skills).map((c) => c.due.getTime())
  return dues.length ? new Date(Math.min(...dues)) : undefined
}

/** Consecutive failures that should trigger a mnemonic/etymology intervention (AI phase). */
export const INTERVENTION_AFTER_WRONG = 3
export const needsIntervention = (state: UserWordState) =>
  state.stats.consecutiveWrong >= INTERVENTION_AFTER_WRONG
