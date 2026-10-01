import type { Card, Grade } from 'ts-fsrs'

export type TargetLanguage = 'en' | 'fr' | 'es'
export const TARGET_LANGUAGES: readonly TargetLanguage[] = ['en', 'fr', 'es']

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export const CEFR_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'phrase'
  | 'other'

/** Grammatical gender, relevant for FR/ES nouns. 'mf' = same form for both. */
export type Gender = 'm' | 'f' | 'mf'

export type Register = 'neutral' | 'formal' | 'informal' | 'slang' | 'academic' | 'literary'

/**
 * Skills are tracked independently: knowing a word in one direction says little about the other.
 * Each skill gets its own FSRS card.
 */
export type Skill = 'recognition' | 'recall' | 'production' | 'listening' | 'collocation'
export const SKILLS: readonly Skill[] = ['recognition', 'recall', 'production', 'listening', 'collocation']

// ---------------------------------------------------------------------------
// Vocabulary (shared catalog, read-only at runtime)
// ---------------------------------------------------------------------------

export interface Example {
  text: string
  /** Turkish translation of the sentence. */
  translation: string
  /** The exact surface form of the target word inside `text` (e.g. "abandoned"), used for cloze. */
  form: string
}

export interface Sense {
  id: string
  /** Primary Turkish meaning. */
  gloss: string
  /** Other acceptable Turkish meanings for this sense. */
  altGlosses?: string[]
  definition?: string
  register?: Register
  examples: Example[]
}

export interface Collocation {
  phrase: string
  translation: string
  /** Typical learner errors, e.g. "do a decision" — used as distractors and to classify mistakes. */
  wrongVariants?: string[]
}

export type RelationType = 'synonym' | 'antonym' | 'confusable' | 'related'

export interface WordRelation {
  type: RelationType
  targetId: string
}

export interface WordFamilyMember {
  lemma: string
  partOfSpeech: PartOfSpeech
  gloss: string
  /** Morphology note, e.g. "decide + -sion". */
  morphology?: string
  entryId?: string
}

export interface VocabularyEntry {
  /** Stable id, e.g. "en:decision". */
  id: string
  language: TargetLanguage
  lemma: string
  partOfSpeech: PartOfSpeech
  /** FR/ES nouns. */
  gender?: Gender
  /** Article shown with the lemma for FR/ES nouns, e.g. "la", "el", "l'". */
  article?: string
  cefr: CefrLevel
  /** 1 = most frequent. */
  frequencyRank: number
  ipa?: string
  audioUrl?: string
  register: Register
  /** Ordered by importance; senses[0] is introduced first. */
  senses: Sense[]
  collocations: Collocation[]
  relations: WordRelation[]
  wordFamily: WordFamilyMember[]
  /** Other accepted spellings of the lemma (e.g. "colour"). */
  alternativeForms?: string[]
  commonMistakes?: string[]
  tags: string[]
  /** 'user' = added by hand, 'import' = bulk import, 'sample' = bundled sample set. */
  source: EntrySource
  /** When the user added it; user words are introduced in the order they were added. */
  addedAt?: Date
}

export type EntrySource = 'user' | 'import' | 'sample'

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

export type ExerciseType =
  | 'mc_meaning' // target word → choose Turkish meaning
  | 'mc_context' // sentence with blank → choose word
  | 'discriminate' // choose between confusable words in context
  | 'typed_translation' // Turkish meaning → type target word
  | 'cloze_typed' // sentence with blank → type the correct form
  | 'word_form' // word family transformation (decide → decision)
  | 'listen_choose' // hear the word → choose meaning
  | 'listen_type' // hear the word → type it
  | 'collocation_choice' // choose the natural collocation

export type Direction =
  | 'target_to_native'
  | 'native_to_target'
  | 'context'
  | 'audio_to_native'
  | 'audio_to_target'

export type Verdict = 'correct' | 'near' | 'wrong'

export type ErrorType =
  | 'meaning' // wrong word / wrong meaning
  | 'accent' // only diacritics differ
  | 'typo' // small edit distance
  | 'article' // FR/ES article missing
  | 'gender' // FR/ES article with wrong gender
  | 'form' // right family, wrong form (decide vs decision)
  | 'confusion' // picked a confusable word (affect/effect)
  | 'collocation' // unnatural word combination (do a decision)

// ---------------------------------------------------------------------------
// Per-user learning state
// ---------------------------------------------------------------------------

export interface WordStats {
  reviews: number
  correct: number
  wrong: number
  hints: number
  totalResponseMs: number
  consecutiveWrong: number
}

export interface UserWordState {
  entryId: string
  language: TargetLanguage
  introducedAt: Date
  /** One FSRS card per skill; created lazily when the skill is first practised. */
  skills: Partial<Record<Skill, Card>>
  lastExerciseType?: ExerciseType
  lastReviewAt?: Date
  stats: WordStats
}

export type ReviewMode = 'normal' | 'practice'

/** One row per answer. The scheduler can be re-evaluated offline from these. */
export interface ReviewEvent {
  id: string
  entryId: string
  language: TargetLanguage
  skill: Skill
  exerciseType: ExerciseType
  direction: Direction
  verdict: Verdict
  correct: boolean
  errorType?: ErrorType
  rating: Grade
  responseMs: number
  hintsUsed: number
  given?: string
  expected?: string
  retrievabilityBefore: number
  stabilityAfter: number
  scheduledDays: number
  mode: ReviewMode
  timestamp: Date
}

export interface Mistake {
  /** `${entryId}|${errorType}|${given}` — the same error repeated increments `count`. */
  id: string
  entryId: string
  errorType: ErrorType
  exerciseType: ExerciseType
  given: string
  expected: string
  count: number
  firstAt: Date
  lastAt: Date
  /** Correct answers on this word since the last occurrence. */
  correctSince: number
  resolved: boolean
}
