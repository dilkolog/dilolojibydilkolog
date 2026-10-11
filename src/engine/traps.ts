import { stripDiacritics } from './answerCheck'
import { pickWeighted, type GrammarLog } from './grammar'
import type { TargetLanguage } from './types'

/**
 * False friends: words that look like another word the learner knows (English for French and
 * Spanish, a Turkish word for English) and mean something else. Marked on the word's page, and
 * asked in a short round: a sentence with the word, and its meaning among three.
 */
export interface TrapWord {
  id: string
  language: TargetLanguage
  lemma: string
  /** The word it looks like. */
  looks: string
  /** What the look-alike makes one think it means (Turkish). */
  trap: string
  /** What it means (Turkish). */
  meaning: string
  /** A sentence with the word, and its Turkish. */
  text: string
  tr: string
  source: string
}

export const TRAP_ROUND = 8

/** Lower case without accents: "collège" and "college" are the same word here. */
const norm = (s: string) => stripDiacritics(s.trim().toLowerCase())

/** The trap a word falls under, if any. */
export const trapOf = (list: readonly TrapWord[], language: TargetLanguage, lemma: string) => list.find((t) => t.language === language && norm(t.lemma) === norm(lemma))

export interface TrapQuestion {
  id: string
  word: TrapWord
  options: string[]
}

const shuffle = <T>(list: readonly T[], rng: () => number): T[] => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The word's meaning, the meaning the look-alike suggests, and the meaning of another trap word (never one equal to these). */
export function trapQuestion(word: TrapWord, all: readonly TrapWord[], rng: () => number): TrapQuestion {
  const taken = new Set([norm(word.meaning), norm(word.trap)])
  const other = shuffle(all.filter((t) => t.id !== word.id && t.language === word.language && !taken.has(norm(t.meaning))), rng)[0]
  return { id: word.id, word, options: shuffle([word.meaning, word.trap, ...(other ? [other.meaning] : [])], rng) }
}

/** A round of the language's trap words, those missed before first (see pickWeighted). */
export function trapRound(all: readonly TrapWord[], log: GrammarLog, language: TargetLanguage, rng: () => number, size = TRAP_ROUND): TrapQuestion[] {
  const pool = all.filter((t) => t.language === language)
  return pickWeighted(pool, log, rng, size).map((w) => trapQuestion(w, pool, rng))
}
