import type { ErrorType, PartOfSpeech, Verdict } from '../engine/types'

/** Model used for every AI feature. */
export const AI_MODEL = 'claude-opus-5-5'

export type AiErrorKind = 'auth' | 'rate' | 'refusal' | 'network' | 'other'

export class AiError extends Error {
  readonly kind: AiErrorKind
  constructor(kind: AiErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

export interface WordInfo {
  input: string
  lemma: string
  partOfSpeech: PartOfSpeech
  gender: 'm' | 'f' | 'none'
  meanings: string[]
  example: string
  exampleTranslation: string
  collocations: { phrase: string; translation: string; wrongVariants: string[] }[]
  confusables: string[]
}

export interface EnrichRequest {
  word: string
  /** Sentence the word was found in; its meaning should be the one used there. */
  context?: string
}

export interface SentenceEvaluation {
  verdict: Verdict
  errorType?: ErrorType
  corrected: string
  feedback: string
}

/** Converts AI word data into the add-word form's fields. */
export function wordInfoToInput(info: WordInfo) {
  return {
    word: info.lemma,
    meaning: info.meanings.join(', '),
    partOfSpeech: info.partOfSpeech,
    gender: info.gender === 'none' ? undefined : info.gender,
    example: info.example,
    exampleTranslation: info.exampleTranslation,
    collocations: collocationLines(info.collocations),
    confusables: info.confusables.join(', '),
  }
}

export interface RetellRequest {
  language: import('../engine/types').TargetLanguage
  /** The episode text in the target language. */
  story: string
  words: { lemma: string; gloss: string }[]
  retelling: string
}

export interface RetellEvaluation {
  feedback: string
  /** The learner's text with errors minimally corrected. */
  corrected: string
  words: { lemma: string; used: boolean; correct: boolean }[]
}

export interface EpisodeRequest {
  language: import('../engine/types').TargetLanguage
  interests: string[]
  /** Free-text wish, e.g. "Paris'te geçen bir aşk hikayesi". */
  custom: string
  /** Words to practise: dictionary form and Turkish meaning. */
  words: { lemma: string; gloss: string }[]
  /** Earlier episodes, oldest first, for continuity. */
  previous: { number: number; title: string; recap: string }[]
}

export interface EpisodeDraft {
  title: string
  paragraphs: { text: string; translation: string }[]
  recap: string
}

export interface Mnemonic {
  etymology: string
  soundAlike: string
  scene: string
}

/** Add-word form fields the AI can suggest one at a time. */
export type SuggestField = 'example' | 'notes' | 'tags' | 'collocations'

export interface SuggestRequest {
  language: import('../engine/types').TargetLanguage
  word: string
  /** Turkish meaning(s) typed so far; picks the sense when the word has several. */
  meaning: string
  fields: SuggestField[]
  /** Tags already in use, so suggestions reuse them instead of inventing near-duplicates. */
  existingTags: string[]
  /** Current example sentence, so a second request gives a different one. */
  currentExample?: string
}

export interface FieldSuggestions {
  example?: string
  exampleTranslation?: string
  note?: string
  tags?: string[]
  collocations?: { phrase: string; translation: string; wrongVariants: string[] }[]
}

/** Formats suggested collocations the way the form's collocation field expects them. */
export function collocationLines(list: NonNullable<FieldSuggestions['collocations']>): string {
  return list.map((c) => `${c.phrase} = ${c.translation}${c.wrongVariants.length ? ` (${c.wrongVariants.join(', ')})` : ''}`).join('\n')
}
