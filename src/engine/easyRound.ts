import type { UserWordState, VocabularyEntry } from './types'

/** Three answers wrong in a row is a bad stretch: time to offer a few easy ones. */
export const EASY_AFTER = 3
/** How many easy questions the offer adds. */
export const EASY_COUNT = 3

/** The last `n` graded answers of a session were all wrong (answers not yet graded, such as introductions, do not count). */
export function struggling(log: readonly { verdict?: string }[], n = EASY_AFTER): boolean {
  const graded = log.filter((l) => l.verdict)
  return graded.length >= n && graded.slice(-n).every((l) => l.verdict === 'wrong')
}

/**
 * The words the learner knows best, for a few easy questions: met at least three times, wrong in a quarter of the answers
 * at most, and the longest memory first. A word in `exclude` (the one on screen, the ones just missed) is left out.
 */
export function easiestWords(states: Iterable<UserWordState>, vocabulary: ReadonlyMap<string, VocabularyEntry>, exclude: ReadonlySet<string>, count = EASY_COUNT): string[] {
  const known: { id: string; memory: number; wrong: number }[] = []
  for (const s of states) {
    const card = s.skills.recognition
    if (s.retired || exclude.has(s.entryId) || !vocabulary.has(s.entryId) || !card || card.reps < 3) continue
    const wrong = s.stats.wrong / Math.max(1, s.stats.reviews)
    if (wrong > 0.25) continue
    known.push({ id: s.entryId, memory: card.stability, wrong })
  }
  return known
    .sort((a, b) => b.memory - a.memory || a.wrong - b.wrong)
    .slice(0, count)
    .map((k) => k.id)
}
