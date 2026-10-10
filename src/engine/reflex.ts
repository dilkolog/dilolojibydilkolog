import { pickWeighted, type GrammarLog } from './grammar'
import type { TargetLanguage } from './types'

/**
 * The 3-second round: everyday phrases ("I changed my mind", "I'm on my way") that should come
 * without thinking. The Turkish is shown, the phrase is picked among four before time runs out.
 * Speed is what is trained, so the phrases are short and the choices plausible (same kind first).
 */
export interface ReflexPhrase {
  id: string
  /** What the situation is: choices come from the same group first. */
  group: string
  tr: string
  fr: string
  es: string
  en: string
}

export interface ReflexQuestion {
  id: string
  turkish: string
  answer: string
  options: string[]
}

export const REFLEX_SECONDS = 3
export const REFLEX_ROUND = 10
export const REFLEX_OPTIONS = 4

const shuffle = <T>(list: readonly T[], rng: () => number): T[] => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The question for one phrase: three other phrases of the language as choices, those of its group first. */
export function reflexQuestion(phrase: ReflexPhrase, all: readonly ReflexPhrase[], language: TargetLanguage, rng: () => number): ReflexQuestion {
  const answer = phrase[language]
  const others = all.filter((p) => p.id !== phrase.id && p[language] !== answer)
  const near = shuffle(others.filter((p) => p.group === phrase.group), rng)
  const far = shuffle(others.filter((p) => p.group !== phrase.group), rng)
  const wrong = [...new Set([...near, ...far].map((p) => p[language]))].slice(0, REFLEX_OPTIONS - 1)
  return { id: phrase.id, turkish: phrase.tr, answer, options: shuffle([answer, ...wrong], rng) }
}

/** A round: the phrases never tried or more often missed first (see pickWeighted). */
export function reflexRound(all: readonly ReflexPhrase[], log: GrammarLog, language: TargetLanguage, rng: () => number, size = REFLEX_ROUND): ReflexQuestion[] {
  return pickWeighted(all, log, rng, size).map((p) => reflexQuestion(p, all, language, rng))
}
