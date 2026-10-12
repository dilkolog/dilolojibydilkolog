import { AFFIXES, derivedWords, joined, type Affix, type WordLookup } from './derive'
import { pickWeighted, type GrammarLog } from './grammar'
import type { PartOfSpeech, TargetLanguage } from './types'

/**
 * Affix hunt: a word and the one it becomes ("comfortable" → "comfortably", rahatça, adverb): which
 * ending (or beginning) makes it? The answer is built from the dictionary's own families, so it is
 * a real word, and the wrong choices are endings that do not make a word of this one (comfort-ment).
 * The learner builds the form themself instead of memorising each member of the family.
 */
export interface HuntQuestion {
  /** `${base}|${word}`: the key of the learner's log. */
  id: string
  language: TargetLanguage
  base: string
  baseGloss?: string
  basePos: PartOfSpeech
  word: string
  wordGloss: string
  wordPos: PartOfSpeech
  answer: Affix
  /** The answer and the wrong ones, in the order shown. */
  options: Affix[]
}

export const HUNT_ROUND = 8
const WRONG = 2

const shuffle = <T>(list: readonly T[], rng: () => number): T[] => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Every question the family of `root` gives: each derived word with a Turkish meaning, from the word it was built on. */
export function huntQuestionsOf(root: string, language: TargetLanguage, lookup: WordLookup, rng: () => number): HuntQuestion[] {
  const out: HuntQuestion[] = []
  const all = AFFIXES[language]
  for (const d of derivedWords(root, language, lookup)) {
    // A very short base (n, st, le, man, let) is mostly a coincidence of spelling, and a question needs a meaning to show.
    if (!d.gloss || d.parent.length < 4) continue
    const base = lookup(d.parent)
    if (!base) continue
    // Stricter than the family card: a question must not be a coincidence (fact → faction, universe → university), so the ending has to fit the base's part of speech.
    if (d.affix.from?.length && !d.affix.from.includes(base.pos)) continue
    // Wrong choices: same side of the word, and no word of the dictionary comes out of them (so none is a second right answer).
    const wrong = all.filter((a) => a.kind === d.affix.kind && a.form !== d.affix.form && !joined(d.parent, a, language, base.pos).some((w) => lookup(w)))
    if (wrong.length < WRONG) continue
    out.push({
      id: `${d.parent}|${d.word}`,
      language,
      base: d.parent,
      baseGloss: base.gloss,
      basePos: base.pos,
      word: d.word,
      wordGloss: d.gloss,
      wordPos: d.pos,
      answer: d.affix,
      options: shuffle([d.affix, ...shuffle(wrong, rng).slice(0, WRONG)], rng),
    })
  }
  return out
}

/** A round: each base word and each derived word once, the pairs missed before first (see pickWeighted). */
export function huntRound(pool: readonly HuntQuestion[], log: GrammarLog, rng: () => number, size = HUNT_ROUND): HuntQuestion[] {
  const out: HuntQuestion[] = []
  const bases = new Set<string>()
  const words = new Set<string>()
  for (const q of pickWeighted(pool, log, rng, pool.length)) {
    // A base once, and a derived word once (jury → juriste and juré → juriste are the same answer twice).
    if (bases.has(q.base) || words.has(q.word)) continue
    bases.add(q.base)
    words.add(q.word)
    out.push(q)
    if (out.length >= size) break
  }
  return out
}

/** Questions from the learner's own words first, then from the most frequent ones, until there are enough for a few rounds. */
export function huntPool(own: readonly string[], frequent: readonly string[], language: TargetLanguage, lookup: WordLookup, rng: () => number, { priority = [], want = HUNT_ROUND * 4, maxRoots = 600 }: { /** Roots whose pairs were missed before: asked about first, so a miss comes back. */ priority?: readonly string[]; want?: number; maxRoots?: number } = {}): HuntQuestion[] {
  const pool: HuntQuestion[] = []
  const seen = new Set<string>()
  const roots = [...priority, ...shuffle(own, rng), ...shuffle(frequent.slice(0, 4000), rng)]
  let tried = 0
  for (const w of roots) {
    const word = w.toLocaleLowerCase(language)
    if (seen.has(word) || !lookup(word)) continue
    seen.add(word)
    for (const q of huntQuestionsOf(word, language, lookup, rng)) if (!pool.some((p) => p.id === q.id)) pool.push(q)
    if (pool.length >= want || ++tried >= maxRoots) break
  }
  return pool
}
