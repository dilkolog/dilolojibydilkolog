import { normalize, splitArticle, stripDiacritics } from './answerCheck'
import type { Example, TargetLanguage } from './types'

/**
 * How well a sentence fits the learner: how many of its other words they would not know yet.
 * One unknown word is the sweet spot (i + 1): the sentence can be understood and the new word
 * learned from context; three or four make it a puzzle. A word counts as known when it is one
 * of the very frequent words of the language or one of the learner's own words.
 */
export type Easy = (word: string) => boolean

/** The words of a sentence, lowercased, without the very short ones (articles, particles) and numbers. */
export function tokens(text: string): string[] {
  return (text.match(/[\p{L}]+/gu) ?? []).map((t) => t.toLocaleLowerCase()).filter((t) => t.length > 2)
}

/** Words of `text`, other than the target, that `easy` does not recognise. */
export function unknownCount(example: Pick<Example, 'text' | 'form'>, lemma: string, easy: Easy): number {
  const skip = new Set([example.form, lemma].filter(Boolean).map((w) => w!.toLocaleLowerCase()))
  return tokens(example.text).filter((t) => !skip.has(t) && !easy(t)).length
}

/** The sentences with their `fit` recorded, best fit first (then the shorter), in a stable order. */
export function rankByFit(examples: readonly Example[], lemma: string, easy: Easy): Example[] {
  return examples
    .map((x, i) => ({ x: { ...x, fit: unknownCount(x, lemma, easy) }, i }))
    .sort((a, b) => a.x.fit - b.x.fit || a.x.text.length - b.x.text.length || a.i - b.i)
    .map(({ x }) => x)
}

/** The "i + 1" sentences of a word (at most one unknown word); when none qualifies, all of them, so a word with sentences always has some. */
export function sweetSpot(examples: readonly Example[]): Example[] {
  const good = examples.filter((x) => x.fit !== undefined && x.fit <= 1)
  return good.length ? good : [...examples]
}

/** A word is easy if it is frequent (rank at or under `maxRank`) or one of the learner's own. */
export function easyWords(language: TargetLanguage, rank: ReadonlyMap<string, number>, own: Iterable<string>, maxRank = 2000): Easy {
  const mine = new Set([...own].map((w) => stripDiacritics(splitArticle(normalize(w).toLocaleLowerCase(language), language).rest)))
  return (word) => {
    const r = rank.get(word)
    return (r !== undefined && r <= maxRank) || mine.has(stripDiacritics(word))
  }
}
