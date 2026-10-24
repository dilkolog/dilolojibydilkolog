import { displayForm } from './exercises'
import { openMistakes } from './mistakes'
import { isDueFor } from './practice'
import type { Mistake, UserWordState, VocabularyEntry } from './types'

/** How many words the day's talk aims at, and how few are worth a talk at all. */
export const DAILY_WORDS = 5
export const DAILY_MIN = 3

/**
 * The words for today's short talk with Monki: the ones that went wrong most lately first, then the ones due for a review
 * today (the ones they struggle with before the easy ones), then the other words being learned. Written as they are learned
 * (with the article). Fewer than `DAILY_MIN` words and there is no talk to offer.
 */
export function dailyTalkWords(
  vocabulary: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  mistakes: readonly Mistake[],
  now: Date,
  count = DAILY_WORDS,
): string[] {
  const byId = new Map(vocabulary.map((v) => [v.id, v]))
  const stateById = new Map(states.map((s) => [s.entryId, s]))
  const picked: VocabularyEntry[] = []
  const take = (entry: VocabularyEntry | undefined) => {
    if (entry && !stateById.get(entry.id)?.retired && !picked.includes(entry) && picked.length < count) picked.push(entry)
  }
  for (const m of openMistakes(mistakes).sort((a, b) => b.count - a.count)) take(byId.get(m.entryId))
  const wrongShare = (s: UserWordState) => s.stats.wrong / Math.max(1, s.stats.reviews)
  const learning = states.filter((s) => byId.has(s.entryId) && !s.retired && s.stats.reviews > 0)
  const due = learning.filter((s) => Object.keys(s.skills).some((k) => isDueFor(s, k as keyof UserWordState['skills'], now))).sort((a, b) => wrongShare(b) - wrongShare(a))
  for (const s of due) take(byId.get(s.entryId))
  for (const s of [...learning].sort((a, b) => wrongShare(b) - wrongShare(a))) take(byId.get(s.entryId))
  return picked.length >= DAILY_MIN ? picked.map(displayForm) : []
}
