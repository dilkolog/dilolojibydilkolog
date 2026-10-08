import { Rating, type Card } from 'ts-fsrs'
import { EXERCISES } from './exercises'
import { gradeAttempt } from './grading'
import { recordCorrect, recordMistake } from './mistakes'
import type { Scheduler } from './scheduler'
import type {
  Confidence,
  ErrorType,
  ExerciseType,
  Mistake,
  ReviewEvent,
  ReviewMode,
  UserWordState,
  VocabularyEntry,
  Verdict,
} from './types'

const DAY_MS = 86_400_000

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
  confidence?: Confidence
}

export interface ReviewResult {
  state: UserWordState
  event: ReviewEvent
  mistakes: Mistake[]
}

/** Typed from Turkish right at least once: a recall card that has held (a lapse leaves it below a day). */
export const recallProven = (state: UserWordState) => (state.skills.recall?.reps ?? 0) > 0 && (state.skills.recall?.stability ?? 0) >= 1

/**
 * A right choice says less than a right typed answer (one in four is a guess, and picking out is
 * easier than bringing to mind). Until the word has been recalled, a choice question's interval
 * is held to a day, so the word comes back tomorrow, when recall is asked, instead of in a week.
 */
export function holdUntilRecalled(card: Card, state: UserWordState, input: { exerciseType: ExerciseType }, now: Date): Card {
  if (EXERCISES[input.exerciseType].input !== 'choice' || recallProven(state)) return card
  const limit = new Date(now.getTime() + DAY_MS)
  return card.due > limit ? { ...card, due: limit, scheduled_days: 1 } : card
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
    const nextCard = holdUntilRecalled(scheduler.review(card, rating, now), state, input, now)
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
      // A slip on a retired word brings it back into routine reviews.
      ...(correct ? {} : { retired: undefined }),
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
        highConfidence: input.verdict === 'wrong' && input.confidence === 'sure' ? true : undefined,
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
    confidence: input.confidence,
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

/**
 * "I already know this word": skip the beginner steps by rating recognition and recall Easy,
 * so the word starts with a long interval instead of being drilled from scratch. It is still
 * scheduled, so a wrong self-assessment is caught at the first real review.
 */
export function markKnown(state: UserWordState, scheduler: Scheduler, now: Date): UserWordState {
  const skills = { ...state.skills }
  for (const skill of ['recognition', 'recall'] as const) {
    skills[skill] = scheduler.review(skills[skill] ?? scheduler.newCard(now), Rating.Easy, now)
  }
  return { ...state, skills, lastReviewAt: now }
}
