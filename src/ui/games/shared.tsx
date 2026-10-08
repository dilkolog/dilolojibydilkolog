import { EXERCISES } from '../../engine/exercises'
import { isDueFor } from '../../engine/practice'
import { newWordState, processAttempt } from '../../engine/review'
import type { ExerciseType, Mistake, TargetLanguage, UserWordState, VocabularyEntry } from '../../engine/types'
import { db, scheduler } from '../../data/instance'

export interface Props {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes?: Mistake[]
  onChanged: () => void
}

/**
 * A game's answer. A word whose review is due (for the skill the question uses) gets a real review:
 * the schedule moves, as in the day's session, so time spent in games isn't lost. Any other answer
 * is stored as practice: it earns (reduced) XP but doesn't move the schedule, so playing can't
 * inflate how well a word seems known. The state is read fresh, so a word answered twice in one
 * round counts once. `schedule: false` keeps an answer practice regardless (matching pairs, where
 * elimination gives the last ones away). Returns whether it counted as a review.
 */
export async function recordPractice(entry: VocabularyEntry, state: UserWordState | undefined, exerciseType: ExerciseType, correct: boolean, responseMs: number, answer?: { given?: string; expected?: string }, options: { schedule?: boolean } = {}): Promise<boolean> {
  const now = new Date()
  const fresh = (await db.wordStates.get(entry.id)) ?? state
  const due = options.schedule !== false && !!fresh && isDueFor(fresh, EXERCISES[exerciseType].skill, now)
  const mistakes = due ? await db.mistakes.where('entryId').equals(entry.id).toArray() : []
  const result = processAttempt(
    fresh ?? newWordState(entry, now),
    { exerciseType, verdict: correct ? 'correct' : 'wrong', responseMs, hintsUsed: 0, maxHints: 0, at: now, mode: due ? 'normal' : 'practice', ...answer },
    mistakes,
    scheduler,
  )
  if (due) await db.saveReview(result)
  else await db.events.add(result.event)
  return due
}

export const FLUENCY_ROUND = 20
/** Below this accuracy a fast time is guessing, not fluency, so it can't set a record. */
export const FLUENCY_MIN_ACCURACY = 0.85

/** A percentage only counts as a record from half right up: a first round at 10% is no record. */
export const RECORD_MIN_PCT = 50
export const isPctRecord = (pct: number, best?: number) => pct >= RECORD_MIN_PCT && pct > (best ?? 0)

export const fmt = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} sn`
