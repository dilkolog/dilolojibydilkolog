import type { TargetLanguage } from './types'

/**
 * A phrase built from the words of a sentence around a tapped word: the reader widens it one word at
 * a time to the left or right ("avoir envie de", "take part in") and puts it on the list as one card.
 */
export interface PhraseWindow {
  /** The phrase as written in the sentence, without the punctuation at its ends. */
  text: string
  /** How many more words there are on each side. */
  left: number
  right: number
}

// A word is letters, joined by apostrophes and inner hyphens ("aujourd'hui", "peut-être", "don't").
const WORD = /[\p{L}\p{N}](?:[\p{L}\p{N}'’]|-(?=[\p{L}\p{N}]))*/gu

/** The word positions of a sentence: where each one starts and ends in the text. */
function spans(sentence: string): { start: number; end: number; word: string }[] {
  return [...sentence.matchAll(WORD)].map((m) => ({ start: m.index!, end: m.index! + m[0].length, word: m[0] }))
}

const fold = (s: string, language: TargetLanguage) => s.replace(/’/g, "'").toLocaleLowerCase(language)

/** The index of the tapped word among a sentence's words (first match; elided "l'" and "d'" forms also match the bare word). */
export function wordIndex(sentence: string, tapped: string, language: TargetLanguage): number {
  const all = spans(sentence)
  const want = fold(tapped, language)
  const exact = all.findIndex((w) => fold(w.word, language) === want)
  if (exact >= 0) return exact
  return all.findIndex((w) => fold(w.word, language).split("'").pop() === want)
}

/** The phrase made of `before` words before and `after` words after the word at `index` (clamped to the sentence). */
export function phraseAround(sentence: string, index: number, before: number, after: number): PhraseWindow | null {
  const all = spans(sentence)
  if (index < 0 || index >= all.length) return null
  const from = Math.max(0, index - Math.max(0, before))
  const to = Math.min(all.length - 1, index + Math.max(0, after))
  return { text: sentence.slice(all[from].start, all[to].end), left: from, right: all.length - 1 - to }
}

/** A sentence cut into words and what lies between them (spaces, punctuation), in order, so it can be drawn with each word tappable. */
export function wordSegments(text: string): { text: string; word: boolean }[] {
  const out: { text: string; word: boolean }[] = []
  let at = 0
  for (const w of spans(text)) {
    if (w.start > at) out.push({ text: text.slice(at, w.start), word: false })
    out.push({ text: w.word, word: true })
    at = w.end
  }
  if (at < text.length) out.push({ text: text.slice(at), word: false })
  return out
}
