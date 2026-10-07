/**
 * Choosing example sentences for the word pack (scripts/build-pack-sentences.ts): the pure part.
 * A sentence fits a word when it contains the word or one of its forms; the best ones are short and
 * made of frequent words otherwise, so the new word is the only hard one (i + 1).
 */
export interface Candidate {
  text: string
  turkish: string
}

const MIN_WORDS = 4
const MAX_WORDS = 12

/** The words of a sentence, lower-cased, without punctuation. */
export function sentenceTokens(text: string, language: string): string[] {
  return (text.match(/[\p{L}'’-]+/gu) ?? []).flatMap((t) => t.toLocaleLowerCase(language).split(/['’-]/)).filter(Boolean)
}

/**
 * The best `max` sentences for a word among `candidates`: within 4–12 words, fewest words outside
 * the `easy` set (the language's most frequent words), then the shortest, one per Turkish meaning.
 */
export function pickSentences(candidates: readonly Candidate[], language: string, easy: (w: string) => boolean, max = 2): [string, string][] {
  const scored = candidates
    .map((c) => {
      const tokens = sentenceTokens(c.text, language)
      return { c, words: tokens.length, hard: tokens.filter((t) => !easy(t)).length }
    })
    .filter((x) => x.words >= MIN_WORDS && x.words <= MAX_WORDS)
    .sort((a, b) => a.hard - b.hard || a.words - b.words || a.c.text.localeCompare(b.c.text))
  const out: [string, string][] = []
  const seen = new Set<string>()
  for (const { c } of scored) {
    const key = c.turkish.toLocaleLowerCase('tr')
    if (seen.has(key) || out.some(([t]) => t === c.text)) continue
    seen.add(key)
    out.push([c.text, c.turkish])
    if (out.length >= max) break
  }
  return out
}
