import { STOP } from '../engine/extract'
import { readingKey } from '../engine/reading'
import type { TargetLanguage } from '../engine/types'

/** Paragraphs of a comfortable dictogloss length, from the learner's reading library. */
export function glossParagraphs(texts: readonly string[]): string[] {
  return texts.flatMap((t) => t.split(/\n\s*\n/)).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => {
    const n = p.split(' ').length
    return n >= 30 && n <= 90
  })
}

/** Content words of the original and whether the reconstruction brought each back. */
export function recallCheck(original: string, attempt: string, language: TargetLanguage): { token: string; word: string; content: boolean; recalled: boolean }[] {
  const have = new Set([...attempt.matchAll(/[\p{L}'’-]+/gu)].map((m) => readingKey(m[0], language)))
  return original.split(/(\s+)/).map((token) => {
    const word = token.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    const content = word.length >= 3 && !STOP[language].has(word.toLocaleLowerCase(language))
    return { token, word, content, recalled: content && have.has(readingKey(word, language)) }
  })
}

/** The sentence of `paragraph` that contains `word`, for the new word's example. */
export function sentenceWith(paragraph: string, word: string): string {
  const sentences = paragraph.split(/(?<=[.!?…])\s+/)
  return sentences.find((x) => x.includes(word)) ?? paragraph
}
