import type { TargetLanguage, VocabularyEntry } from './types'

/**
 * Words the learner marked as hard (the lightning mark in a session, on a word page and in the
 * list). They are gathered here for a practice of their own, apart from the day's plan.
 */
export const isDifficult = (e: Pick<VocabularyEntry, 'difficult'>): boolean => !!e.difficult

/** The entry with the mark set or cleared; a cleared mark leaves no field behind. */
export function withDifficult(entry: VocabularyEntry, on: boolean): VocabularyEntry {
  const { difficult: _was, ...rest } = entry
  return on ? { ...rest, difficult: true } : rest
}

/** The marked words, of one language or of all. */
export function difficultWords(vocabulary: readonly VocabularyEntry[], language?: TargetLanguage): VocabularyEntry[] {
  return vocabulary.filter((v) => isDifficult(v) && (!language || v.language === language))
}
