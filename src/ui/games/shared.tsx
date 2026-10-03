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

/** Games answers are stored as practice: they earn (reduced) XP but don't move the schedule. */
export async function recordPractice(entry: VocabularyEntry, state: UserWordState | undefined, exerciseType: ExerciseType, correct: boolean, responseMs: number) {
  const result = processAttempt(
    state ?? newWordState(entry, new Date()),
    { exerciseType, verdict: correct ? 'correct' : 'wrong', responseMs, hintsUsed: 0, maxHints: 0, at: new Date(), mode: 'practice' },
    [],
    scheduler,
  )
  await db.events.add(result.event)
}

export const FLUENCY_ROUND = 20
/** Below this accuracy a fast time is guessing, not fluency, so it can't set a record. */
export const FLUENCY_MIN_ACCURACY = 0.85

export const fmt = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} sn`
