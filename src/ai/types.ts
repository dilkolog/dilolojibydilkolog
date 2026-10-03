import type { ErrorType, PartOfSpeech, Verdict } from '../engine/types'


export type AiErrorKind = 'auth' | 'rate' | 'refusal' | 'network' | 'budget' | 'other'

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
  frequencyBand: 'top1000' | 'top3000' | 'top10000' | 'rare'
  literal: string
}

const BAND_RANK = { top1000: 500, top3000: 2000, top10000: 6000, rare: 20000 } as const

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
    frequencyRank: BAND_RANK[info.frequencyBand],
    literal: info.literal,
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

export interface JournalRequest {
  language: import('../engine/types').TargetLanguage
  text: string
  /** Words being learned, so the review can point out where one would have fitted. */
  words: { lemma: string; gloss: string }[]
}

export interface JournalReview {
  corrected: string
  feedback: string
  mistakes: { original: string; correction: string; type: ErrorType | 'grammar'; explanation: string; lemma: string }[]
  suggestions: { lemma: string; sentence: string }[]
  usedWords: string[]
}

export interface PrequestionSet {
  /** Questions in Turkish about the text's key content, with short answers (also Turkish). */
  questions: { question: string; answer: string }[]
}

export interface ErrorReportRequest {
  language: import('../engine/types').TargetLanguage
  /** "decision [spelling]: wrote "decission", expected "decision" ×3", most frequent first. */
  lines: string[]
  answers: number
  wrong: number
}

export interface ErrorReport {
  /** Two or three sentences in Turkish: the month in a nutshell. */
  summary: string
  patterns: { title: string; explanation: string; examples: string[]; tip: string }[]
  /** Short practice items aimed at the patterns. */
  drills: { prompt: string; answer: string; note: string }[]
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
}

export interface ChatRequest {
  language: import('../engine/types').TargetLanguage
  /** Scenario in Turkish, e.g. "Kafede sipariş vermek". */
  scenario: string
  words: { lemma: string; gloss: string }[]
  history: ChatTurn[]
  /** Mission goals in Turkish; the reply says which ones the learner has achieved. */
  goals?: string[]
}

export interface ChatReply {
  reply: string
  /** Correction of the learner's last message, if it had a real mistake. */
  correction: { original: string; corrected: string; note: string } | null
  usedWords: string[]
  /** Indices of mission goals achieved so far (empty outside missions). */
  goalsDone: number[]
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
