import type { TargetLanguage } from './types'

/**
 * An exam-style writing task (DELF, DELE, Cambridge style: a message, a formal letter, an opinion, a story, an
 * essay) with the length the exam asks for and a Turkish checklist. Original wording, not an official paper: the
 * screen says so.
 */
export interface ExamTask {
  id: string
  language: TargetLanguage
  /** The family it imitates: DELF/DALF, DELE, Cambridge or IELTS. */
  exam: string
  level: 'A2' | 'B1' | 'B2' | 'C1'
  /** What kind of text it is, in Turkish ("Resmî şikâyet mektubu"). */
  kind: string
  /** A short title in the target language. */
  title: string
  /** The task as an exam gives it, in the target language. */
  instruction: string
  /** The same task in Turkish. */
  tr: string
  min: number
  max: number
  /** What the text should do, in Turkish, one thing per line. */
  checklist: string[]
  /** Phrases in the target language that suit this kind of text. */
  phrases: string[]
}

export type LengthState = 'short' | 'in' | 'long'

/** Where a text stands against the length asked for. */
export function lengthState(words: number, min: number, max: number): LengthState {
  if (words < min) return 'short'
  return words > max ? 'long' : 'in'
}

/** The words of a text, the way an exam counts them: runs between spaces; a lone "?" or "—" is not a word. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}
