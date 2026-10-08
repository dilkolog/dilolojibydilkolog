import { State } from 'ts-fsrs'
import type { ReviewEvent, TargetLanguage, UserWordState } from './types'

/** Days of recall stability from which a word counts as one you can bring to mind on your own. */
export const RECALL_DAYS = 7
const WEEK_MS = 7 * 86_400_000
/** Fewer real reviews than this in the week say nothing reliable about the recall rate. */
const MIN_REVIEWS = 20

export interface StudyGains {
  /** Words typed from Turkish reliably: recall graduated and stable for a week or more. */
  recallable: number
  /** Of those, the ones that crossed the line this week. */
  newThisWeek: number
  /** Share of real reviews (not first meetings) answered right this week; null below MIN_REVIEWS. */
  recallRate: number | null
}

/**
 * What studying has bought, in terms that matter: words that now come to mind from their meaning,
 * and how often a word due for review is still remembered (against the target retention). XP and
 * streaks say how much was done; this says what it did.
 */
export function studyGains(states: readonly UserWordState[], events: readonly ReviewEvent[], language: TargetLanguage, now: Date): StudyGains {
  const since = now.getTime() - WEEK_MS
  const recallable = states.filter((s) => s.language === language && s.skills.recall?.state === State.Review && s.skills.recall.stability >= RECALL_DAYS)
  const recall = events.filter((e) => e.language === language && e.skill === 'recall' && e.mode === 'normal')
  const crossedBefore = new Set(recall.filter((e) => new Date(e.timestamp).getTime() < since && e.stabilityAfter >= RECALL_DAYS).map((e) => e.entryId))
  const crossedNow = new Set(recall.filter((e) => new Date(e.timestamp).getTime() >= since && e.stabilityAfter >= RECALL_DAYS).map((e) => e.entryId))
  const ids = new Set(recallable.map((s) => s.entryId))
  const newThisWeek = [...crossedNow].filter((id) => ids.has(id) && !crossedBefore.has(id)).length
  const reviews = events.filter((e) => e.language === language && e.mode === 'normal' && e.retrievabilityBefore > 0 && new Date(e.timestamp).getTime() >= since)
  const recallRate = reviews.length >= MIN_REVIEWS ? reviews.filter((e) => e.verdict !== 'wrong').length / reviews.length : null
  return { recallable: recallable.length, newThisWeek, recallRate }
}
