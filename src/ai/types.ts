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

export interface WordSuggestRequest {
  language: import('../engine/types').TargetLanguage
  /** How many words to propose. */
  count: number
  /** The learner's interests (profile chips); none means everyday life. */
  interests: string[]
  /** Words already in the list (never proposed again). */
  have: string[]
  /** A few of the words the learner has: they show the level. */
  sample: string[]
}

export interface NotesQuizRequest {
  language: import('../engine/types').TargetLanguage
  /** The learner's own notes: grammar rules, a lesson, a list of expressions. */
  notes: string
  /** How many questions. */
  count: number
}

/** A multiple-choice question about the notes. */
export interface QuizQuestion {
  question: string
  options: string[]
  /** Index of the right option. */
  answer: number
  /** Why it is right, in Turkish, from the notes. */
  explanation: string
}

export interface PersonalSentencesRequest {
  language: import('../engine/types').TargetLanguage
  word: string
  meaning: string
  /** The learner's interests (profile chips); none means everyday situations. */
  interests: string[]
  /** Sentences the word already has, so the new ones differ. */
  existing: string[]
}

export interface PersonalSentence {
  /** The sentence with the word's form between asterisks: "She *abandoned* the plan." */
  text: string
  translation: string
}

export interface ConjugationExplainRequest {
  language: 'fr' | 'es'
  verb: string
  /** The tense asked, by name ("passé composé"). */
  tense: string
  /** The subject asked ("nous"). */
  subject: string
  /** The right form, with its subject. */
  expected: string
  typed: string
  /** What kind of slip the app found ("Kişi karıştırma"), and what it can say of it. */
  kind: string
  note?: string
  /** The whole tense, one subject and form a line. */
  table: string[]
}

export interface PronTipsRequest {
  language: import('../engine/types').TargetLanguage
  /** What was to be said. */
  text: string
  /** What the speech service heard. */
  heard: string
  /** The words worth a tip: score 0–100, or left out. */
  words: { word: string; accuracy: number; omitted?: boolean }[]
}

export interface PronTip {
  word: string
  tip: string
}

export interface WeekNoteRequest {
  language: import('../engine/types').TargetLanguage
  /** The week's figures, kinds of error and most missed words, one fact a line. */
  lines: string[]
}

export interface SessionNoteRequest {
  language: import('../engine/types').TargetLanguage
  answers: number
  wrong: number
  /** "gender ×3" error totals, then "chat (kedi): 2 wrong" for the words missed. */
  lines: string[]
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

/** What Monki is doing: free talk, a quiz one question at a time, a role-play scene, or going through the learner's recent mistakes. */
export type MonkiMode = 'chat' | 'quiz' | 'roleplay' | 'mistakes' | 'words'

/** One turn with Monki, the assistant: free talk about the language being learned. */
export interface MonkiRequest {
  language: import('../engine/types').TargetLanguage
  history: ChatTurn[]
  /** The learner's name, for a friendlier tone, when they have set one. */
  name?: string
  /** Words they struggle with (lemmas), to build examples and small quizzes from. */
  weakWords?: string[]
  mode?: MonkiMode
  /** Role-play: the scene, in Turkish ("Kafede sipariş vermek"). */
  scenario?: string
  /** Mistakes mode: what went wrong lately, most repeated first. */
  mistakes?: { word: string; given: string; expected: string }[]
  /** Words mode: the words the learner should get to use in the talk. */
  targets?: string[]
}

export interface MonkiReply {
  reply: string
  /** Two or three short follow-ups the learner may tap (Turkish; in a role-play, things to say back in the target language). */
  suggestions: string[]
  /** Role-play: exactly what the other person says aloud, in the target language (spoken in voice mode). Empty otherwise. */
  say?: string
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

/** A relative or another form of a word, proposed by the AI for the learner to add. */
export interface FamilySuggestion {
  /** Written as it would be added: nouns with their article in FR/ES ("la décision"). */
  word: string
  meaning: string
  kind: 'form' | 'family' | 'phrase'
  /** e.g. "dişil", "çoğul", "isim", "zarf", "kalıp". */
  note: string
}
