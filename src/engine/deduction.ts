import { cleanToken } from './extract'
import type { ReadSentence } from './reading'
import type { TargetLanguage } from './types'

/**
 * Deduction mode: some unknown words are hidden in the text, so the meaning has to be worked out
 * from the sentence before looking anything up. A word is only hidden where there is context to
 * work from: a sentence of some length, one hidden word in it, a word long enough to be a real one.
 */
export const MASK_MIN_LETTERS = 5
export const MASK_MIN_WORDS = 6
/** Easy texts (picture stories) have short sentences: where they average under 6 words, 4 are enough. */
export const MASK_MIN_WORDS_EASY = 4
const EASY_AVERAGE = 6
/** Hidden words in one text: enough to practise, not so many that it stops being readable. */
export const MASK_MAX = 15

/** Where a token sits: "paragraph.sentence.token". */
export const posKey = (i: number, j: number, k: number) => `${i}.${j}.${k}`

const isCapital = (text: string) => /^\p{Lu}/u.test(text)

/** The words to hide: per sentence the longest unseen word (the first of equals), in text order, at most MASK_MAX. */
export function maskPositions(paragraphs: readonly (readonly ReadSentence[])[], language: TargetLanguage): Set<string> {
  const counts = paragraphs.flatMap((p) => p.map((s) => s.tokens.filter((t) => t.key).length)).filter((n) => n > 0)
  const average = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0
  const minWords = average < EASY_AVERAGE ? MASK_MIN_WORDS_EASY : MASK_MIN_WORDS
  const out = new Set<string>()
  for (let i = 0; i < paragraphs.length && out.size < MASK_MAX; i++) {
    for (let j = 0; j < paragraphs[i].length && out.size < MASK_MAX; j++) {
      const tokens = paragraphs[i][j].tokens
      if (tokens.filter((t) => t.key).length < minWords) continue
      let best: { k: number; len: number } | undefined
      tokens.forEach((t, k) => {
        if (!t.key || t.status !== 'unseen') return
        // "Est-ce", "imaginez-vous", "par-dessus": grammar glued together, not a word to work out.
        if (t.text.includes('-')) return
        // A capital in the middle of a sentence, or two in a row at its start ("Francet Mamaï"), is a name.
        if (isCapital(t.text)) {
          if (k > 0 && tokens.slice(0, k).some((p) => p.key)) return
          const after = tokens.slice(k + 1).find((n) => n.key)
          if (after && isCapital(after.text)) return
        }
        const len = [...cleanToken(t.text, language)].length
        if (len >= MASK_MIN_LETTERS && (!best || len > best.len)) best = { k, len }
      })
      if (best) out.add(posKey(i, j, best.k))
    }
  }
  return out
}

export type GuessRating = 'exact' | 'close' | 'surprised'
export type DeductionTally = Record<GuessRating, number>
export type DeductionLog = Partial<Record<TargetLanguage, DeductionTally>>

export const GUESS_LABEL: Record<GuessRating, string> = { exact: 'Tam bildim', close: 'Yaklaştım', surprised: 'Şaşırttı' }

export function recordGuess(log: DeductionLog, language: TargetLanguage, rating: GuessRating): DeductionLog {
  const had = log[language] ?? { exact: 0, close: 0, surprised: 0 }
  return { ...log, [language]: { ...had, [rating]: had[rating] + 1 } }
}

/** Two devices' logs together: per language and rating, the larger count. */
export function mergeDeductionLogs(a: DeductionLog = {}, b: DeductionLog = {}): DeductionLog {
  const out: DeductionLog = {}
  for (const l of ['en', 'fr', 'es'] as const) {
    if (!a[l] && !b[l]) continue
    out[l] = { exact: Math.max(a[l]?.exact ?? 0, b[l]?.exact ?? 0), close: Math.max(a[l]?.close ?? 0, b[l]?.close ?? 0), surprised: Math.max(a[l]?.surprised ?? 0, b[l]?.surprised ?? 0) }
  }
  return out
}

/** "7 tahminin 3'ü tam, 2'si yakın" — or nothing before the first guess. */
export function guessSummary(t: DeductionTally | undefined): string | null {
  const n = t ? t.exact + t.close + t.surprised : 0
  if (!t || !n) return null
  return `${n} tahmin: ${t.exact} tam, ${t.close} yakın, ${t.surprised} şaşırttı`
}
