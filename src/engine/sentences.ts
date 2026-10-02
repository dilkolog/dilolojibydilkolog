import type { Card } from 'ts-fsrs'
import { levenshtein, normalize, stripDiacritics } from './answerCheck'
import { STOP } from './extract'
import type { Rng } from './rng'
import type { Scheduler } from './scheduler'
import type { TargetLanguage } from './types'

/**
 * Sentence cards (sentence mining): whole sentences met while reading, kept and reviewed as a
 * unit. A word learned inside a sentence you liked comes with its grammar and its company.
 */
export interface SentenceCard {
  id: string
  language: TargetLanguage
  text: string
  /** Turkish translation, if the learner gave one (enables the translation exercise). */
  translation: string
  /** The word the sentence was saved for; blanked first in cloze. */
  focus?: string
  source?: string
  addedAt: string
  card: Card
}

export type SentenceExercise =
  | { kind: 'cloze'; shown: string; answer: string }
  | { kind: 'dictation'; answer: string }
  | { kind: 'translate'; prompt: string; answer: string }

const TOKEN = /[\p{L}]+(?:['’-][\p{L}]+)*/gu

/** The word to blank: the saved focus word, else the longest word that isn't a function word. */
export function clozeWord(s: Pick<SentenceCard, 'text' | 'focus' | 'language'>, rng: Rng): string {
  const tokens = [...s.text.matchAll(TOKEN)].map((m) => m[0])
  if (s.focus) {
    const f = tokens.find((t) => t.toLocaleLowerCase() === s.focus!.toLocaleLowerCase())
    if (f) return f
  }
  const content = tokens.filter((t) => t.length > 3 && !STOP[s.language].has(t.toLocaleLowerCase()))
  const pool = content.length ? content : tokens
  const longest = [...pool].sort((a, b) => b.length - a.length).slice(0, 3)
  return longest[Math.floor(rng() * longest.length)] ?? tokens[0] ?? ''
}

/** Rotates the exercise: cloze, dictation (when speech exists), translation (when there's one). */
export function sentenceExercise(s: SentenceCard, rng: Rng, canSpeak: boolean): SentenceExercise {
  const kinds: SentenceExercise['kind'][] = ['cloze']
  if (canSpeak) kinds.push('dictation')
  if (s.translation.trim()) kinds.push('translate')
  const kind = kinds[Math.floor(rng() * kinds.length)]
  if (kind === 'dictation') return { kind, answer: s.text }
  if (kind === 'translate') return { kind, prompt: s.translation, answer: s.text }
  const word = clozeWord(s, rng)
  const i = s.text.indexOf(word)
  return { kind: 'cloze', shown: i < 0 ? s.text : `${s.text.slice(0, i)}____${s.text.slice(i + word.length)}`, answer: word }
}

const plain = (s: string) => stripDiacritics(normalize(s)).replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim()

/**
 * How close a typed sentence is to the original: 1 = same words (accents and punctuation
 * aside). Whole sentences are graded by edit distance over characters, so one slip in a long
 * sentence isn't a fail.
 */
export function sentenceScore(given: string, expected: string): number {
  const a = plain(given)
  const b = plain(expected)
  if (!b) return 0
  return Math.max(0, 1 - levenshtein(a, b) / b.length)
}

export type SentenceVerdict = 'correct' | 'near' | 'wrong'

export function gradeSentence(ex: SentenceExercise, given: string): SentenceVerdict {
  if (ex.kind === 'cloze') {
    const g = normalize(given)
    const a = normalize(ex.answer)
    if (g === a) return 'correct'
    return stripDiacritics(g) === stripDiacritics(a) || levenshtein(g, a) <= 1 ? 'near' : 'wrong'
  }
  const score = sentenceScore(given, ex.answer)
  // Translation has many right answers; only a close match counts, the rest is self-checked.
  return score >= 0.95 ? 'correct' : score >= 0.8 ? 'near' : 'wrong'
}

export function newSentence(input: { language: TargetLanguage; text: string; translation?: string; focus?: string; source?: string }, scheduler: Scheduler, now: Date): SentenceCard {
  return {
    id: crypto.randomUUID(),
    language: input.language,
    text: input.text.replace(/\s+/g, ' ').trim(),
    translation: input.translation?.trim() ?? '',
    focus: input.focus,
    source: input.source,
    addedAt: now.toISOString(),
    card: scheduler.newCard(now),
  }
}

export const dueSentences = (all: readonly SentenceCard[], language: TargetLanguage, now: Date) =>
  all.filter((s) => s.language === language && new Date(s.card.due) <= now).sort((a, b) => new Date(a.card.due).getTime() - new Date(b.card.due).getTime())
