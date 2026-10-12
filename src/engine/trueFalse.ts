import { shuffle, type Rng } from './rng'
import type { VocabularyEntry } from './types'

/** "maison = ev": a word with a meaning that is its own or another word's, to be judged. */
export interface Statement {
  entry: VocabularyEntry
  /** The meaning shown next to the word. */
  shown: string
  isTrue: boolean
  /** The word's real meaning (the answer when the statement was false). */
  truth: string
}

const norm = (s: string) => s.toLocaleLowerCase('tr').trim()
const gloss = (e: VocabularyEntry) => e.senses[0]?.gloss ?? ''

/**
 * One statement per word, half of them true. A false one carries another word's meaning, taken from a
 * word of the same kind when there is one (a noun's meaning on a noun is a fairer trap than on a verb),
 * and never a meaning that is also this word's own.
 */
export function buildStatements(words: readonly VocabularyEntry[], pool: readonly VocabularyEntry[], rng: Rng): Statement[] {
  const wantFalse = shuffle(words.map((_, i) => i % 2 === 1), rng)
  return words.map((entry, i) => {
    const truth = gloss(entry)
    const taken = new Set(entry.senses.map((s) => norm(s.gloss)))
    const others = pool.filter((p) => p.id !== entry.id && gloss(p) && !taken.has(norm(gloss(p))))
    const alike = others.filter((p) => p.partOfSpeech === entry.partOfSpeech)
    const from = alike.length >= 3 || (alike.length > 0 && rng() < 0.7) ? alike : others
    if (!wantFalse[i] || from.length === 0) return { entry, shown: truth, isTrue: true, truth }
    return { entry, shown: gloss(from[Math.floor(rng() * from.length)]), isTrue: false, truth }
  })
}
