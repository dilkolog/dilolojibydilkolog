import { MASTERY_STAGES } from '../engine/mastery'
import type { WordResult } from '../engine/session'

const MAX_PLANTS = 9

const rank = (s?: WordResult['stageBefore']) => (s ? MASTERY_STAGES.indexOf(s) : -1)

/** The words that grew first, then the rest, as many as fit the scene. */
export function sceneWords(words: readonly WordResult[]): WordResult[] {
  const grew = (w: WordResult) => rank(w.stageAfter) > rank(w.stageBefore)
  return [...words].sort((a, b) => Number(grew(b)) - Number(grew(a))).slice(0, MAX_PLANTS)
}
