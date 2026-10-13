import { openMistakes } from './mistakes'
import type { Mistake, VocabularyEntry } from './types'

/** What Monki is told about the learner: the words that went wrong most lately, and the mistakes behind them. */
const MAX = 6

const byCount = (mistakes: readonly Mistake[]) => openMistakes(mistakes).sort((a, b) => b.count - a.count)

/** The lemmas of the words with the most open mistakes (once each), for examples and small quizzes. */
export function weakWordsOf(vocabulary: readonly VocabularyEntry[], mistakes: readonly Mistake[]): string[] {
  const lemma = new Map(vocabulary.map((v) => [v.id, v.lemma]))
  const words = byCount(mistakes)
    .map((m) => lemma.get(m.entryId))
    .filter((w): w is string => !!w)
  return [...new Set(words)].slice(0, MAX)
}

/** The open mistakes, most repeated first, with the word, what was written and what was right. */
export function mistakesForMonki(vocabulary: readonly VocabularyEntry[], mistakes: readonly Mistake[]): { word: string; given: string; expected: string }[] {
  const lemma = new Map(vocabulary.map((v) => [v.id, v.lemma]))
  return byCount(mistakes)
    .slice(0, MAX)
    .map((m) => ({ word: lemma.get(m.entryId) ?? '', given: m.given, expected: m.expected }))
    .filter((m) => m.word)
}
