import type { TargetLanguage, VocabularyEntry } from './types'

export interface PronScore {
  at: string
  score: number
}

/** A word's pronunciation counts as good from this average of its latest tries. */
export const PRON_GOOD = 75

/** How many of the latest tries are averaged. */
const RECENT = 3

export interface WeakWord {
  entry: VocabularyEntry
  latest: number
  /** Average of the latest tries. */
  recent: number
  tries: number
}

const average = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/**
 * The words whose pronunciation is still weak: scored at least once and averaging under
 * `PRON_GOOD` over the latest tries, the weakest first. A word leaves the list by scoring well
 * again, so the list shrinks as the learner practises it.
 */
export function weakPronWords(
  scores: Readonly<Record<string, readonly PronScore[]>>,
  vocabulary: readonly VocabularyEntry[],
  language: TargetLanguage,
  limit = 12,
): WeakWord[] {
  const out: WeakWord[] = []
  for (const entry of vocabulary) {
    if (entry.language !== language) continue
    const tries = scores[entry.id]
    if (!tries?.length) continue
    const recent = average(tries.slice(-RECENT).map((s) => s.score))
    if (recent >= PRON_GOOD) continue
    out.push({ entry, latest: tries[tries.length - 1].score, recent, tries: tries.length })
  }
  return out.sort((a, b) => a.recent - b.recent || b.tries - a.tries).slice(0, limit)
}
