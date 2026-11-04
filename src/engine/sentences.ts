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
  /** A short Turkish note shown with the answer: why the sentence is the way it is (a correction's reason). */
  note?: string
  /** The moment of a video the sentence was heard in (a YouTube video read along): played again in review. */
  clip?: SentenceClip
  addedAt: string
  card: Card
}

/** A stretch of a YouTube video, in seconds. */
export interface SentenceClip {
  video: string
  start: number
  end: number
}

/** A clip as it may be kept: an 11-character video id and a short, sensible stretch (anything else is dropped). */
export function cleanClip(clip: unknown): SentenceClip | undefined {
  if (!clip || typeof clip !== 'object') return undefined
  const { video, start, end } = clip as Record<string, unknown>
  if (typeof video !== 'string' || !/^[\w-]{11}$/.test(video) || typeof start !== 'number' || typeof end !== 'number') return undefined
  if (!(start >= 0) || !(end > start) || end - start > 60) return undefined
  return { video, start, end }
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

export function newSentence(input: { language: TargetLanguage; text: string; translation?: string; focus?: string; source?: string; note?: string; clip?: SentenceClip }, scheduler: Scheduler, now: Date): SentenceCard {
  const clip = cleanClip(input.clip)
  return {
    id: crypto.randomUUID(),
    language: input.language,
    text: input.text.replace(/\s+/g, ' ').trim(),
    translation: input.translation?.trim() ?? '',
    focus: input.focus,
    source: input.source,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    ...(clip ? { clip } : {}),
    addedAt: now.toISOString(),
    card: scheduler.newCard(now),
  }
}

export const dueSentences = (all: readonly SentenceCard[], language: TargetLanguage, now: Date) =>
  all.filter((s) => s.language === language && new Date(s.card.due) <= now).sort((a, b) => new Date(a.card.due).getTime() - new Date(b.card.due).getTime())
