import { masteryStage, MASTERY_STAGES } from '../../engine/mastery'
import type { UserWordState, VocabularyEntry } from '../../engine/types'
import { displayForm } from '../../engine/exercises'

/**
 * Whether a message uses a word: its letters without accents or case, the article left off, and
 * for a longer word its stem (the last two letters free, so "decidí" counts for decidir).
 */
export function usesWord(text: string, word: string, language: string): boolean {
  const flat = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase(language)
  const bare = flat(word).replace(/^(le|la|les|l'|el|los|las|un|une|una|the|a|an|to)\s*/, '').trim()
  if (!bare) return false
  const stem = bare.length > 5 ? bare.slice(0, -2) : bare
  return flat(text).includes(stem)
}


/** How many words one talk with Monki aims at. */
export const TALK_WORDS = 5

/**
 * The words of a list worth a talk: the ones being learned (met, not yet settled) first, then new
 * ones; a few at a time, written as they are learned (with the article).
 */
export function talkWords(words: readonly VocabularyEntry[], stateById: ReadonlyMap<string, UserWordState>, count = TALK_WORDS): string[] {
  const strong = new Set(MASTERY_STAGES.slice(-2))
  const rank = (w: VocabularyEntry) => {
    const s = stateById.get(w.id)
    if (!s) return 1
    return strong.has(masteryStage(s)) ? 2 : 0
  }
  return [...words]
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, count)
    .map((w) => displayForm(w))
}
