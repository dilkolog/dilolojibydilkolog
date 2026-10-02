import { localDate } from '../engine/progress'
import { processAttempt } from '../engine/review'
import type { VocabularyEntry } from '../engine/types'
import type { KelimeDB } from './db'
import { scheduler } from './instance'

/**
 * Evidence of use: a word the learner used correctly on their own (in the journal, a chat or a
 * mission, as confirmed by the AI's review) is the strongest sign of knowing it. It counts as a
 * successful production review, at most once per word per day so a long chat doesn't inflate it.
 * Words not started yet are left alone: using one isn't a reason to skip learning it.
 */
export async function creditUsage(db: KelimeDB, entries: readonly VocabularyEntry[], now = new Date()): Promise<string[]> {
  const today = localDate(now)
  const credited = ((await db.meta.get('usageCredit'))?.value as Record<string, string> | undefined) ?? {}
  const done: string[] = []
  for (const entry of entries) {
    if (credited[entry.id] === today) continue
    const state = await db.wordStates.get(entry.id)
    if (!state) continue
    const result = processAttempt(state, { exerciseType: 'free_sentence', verdict: 'correct', responseMs: 20_000, hintsUsed: 0, maxHints: 0, at: now, mode: 'normal' }, [], scheduler)
    await db.saveReview(result)
    credited[entry.id] = today
    done.push(entry.id)
  }
  // Only today's marks matter; older ones are dropped.
  await db.meta.put({ key: 'usageCredit', value: Object.fromEntries(Object.entries(credited).filter(([, d]) => d === today)) })
  return done
}
