import type { Card, Grade } from 'ts-fsrs'

export type TargetLanguage = 'en' | 'fr' | 'es'
export const TARGET_LANGUAGES: readonly TargetLanguage[] = ['en', 'fr', 'es']

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

/** A level inside a list: a category the learner names and orders, like a Memrise level. */
export interface ListLevel {
  id: string
  name: string
}

/** A named list of words in one language (a Memrise-style course); its words carry its id. */
export interface WordList {
  id: string
  language: TargetLanguage
  name: string
  /** In study order. Words with no level come after them. */
  levels?: ListLevel[]
  /** ISO dates; updatedAt settles a rename made on two devices. */
  createdAt: string
  updatedAt: string
}
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
export type Skill = 'recognition' | 'recall' | 'production' | 'listening' | 'collocation' | 'gender'
export const SKILLS: readonly Skill[] = ['recognition', 'recall', 'production', 'listening', 'collocation', 'gender']

// ---------------------------------------------------------------------------
// Vocabulary (shared catalog, read-only at runtime)
// ---------------------------------------------------------------------------

export interface Example {
  text: string
  /** Turkish translation of the sentence. */
  translation: string
  /** The exact surface form of the target word inside `text` (e.g. "abandoned"), used for cloze. */
  form: string
  /** Written by the learner about their own life (self-reference makes it stick). */
  personal?: boolean
  /** A real sentence from a corpus (Tatoeba), with native audio when there is any. */
  source?: { kind: 'tatoeba'; id: number; audioUrl?: string }
  /** The same sentence in the other target languages (Tatoeba translations), when there is one. */
  parallel?: Partial<Record<TargetLanguage, string>>
  /** Where the learner met the sentence: the title of the reading text it was saved from. */
  metIn?: string
  /** Words in it, besides the target, the learner would not know yet: 0–1 is the sweet spot (see sentenceFit.ts). */
  fit?: number
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

/** Who wrote a field, and a fingerprint of the value at that time: if the value still matches, nobody has edited it since. */
export interface FieldSource {
  kind: 'pack' | 'wiktionary' | 'tatoeba' | 'commons' | 'wikidata' | 'lexique' | 'ai'
  h: string
  at: string
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
  /** The word list it belongs to (one at most), like a course on Memrise (see lists.ts). */
  listId?: string
  /** The learner's own level (category) inside that list, e.g. "Selamlaşma". */
  levelId?: string
  /** 1 = most frequent. */
  frequencyRank: number
  ipa?: string
  audioUrl?: string
  /** The learner's own recording of the word (media table id); played instead of TTS. */
  audioId?: string
  /** Picture for the word (media table id), for picture exercises and the word card. */
  imageId?: string
  /** Where the picture came from, e.g. "Wikimedia Commons: …". */
  imageCredit?: string
  /** Personal note: a mnemonic, a usage tip, where you met the word. */
  notes?: string
  /** Idioms: the word-for-word meaning in Turkish ("hamamböceğine sahip olmak"). */
  literal?: string
  register: Register
  /** Ordered by importance; senses[0] is introduced first. */
  senses: Sense[]
  collocations: Collocation[]
  relations: WordRelation[]
  wordFamily: WordFamilyMember[]
  /** Derived and related words found in Wiktionary, offered to add (see wordInfo.ts). */
  familyCandidates?: string[]
  /** The word pack version last applied to this word (see applyPack): a word added later still gets it. */
  packV?: string
  /** When Wiktionary was checked for pronunciation, definition and family. */
  wiktAt?: string
  /** Real sentences from Tatoeba, fetched in the background; [] = looked up, none found. */
  corpus?: Example[]
  /** Other accepted spellings of the lemma (e.g. "colour"). */
  alternativeForms?: string[]
  commonMistakes?: string[]
  tags: string[]
  /** Marked by the learner as hard to remember: gathered for a practice of their own (see difficult.ts). */
  difficult?: boolean
  /** Where automatically filled fields came from, and a fingerprint of what was written (see provenance.ts). */
  sources?: Record<string, FieldSource>
  /** The learner wants to look at this word's data again (a doubtful meaning, a wrong picture). */
  review?: boolean
  /** Where the word comes from, in a line (from the word pack; Wiktionary). */
  etymology?: string
  synonyms?: string[]
  antonyms?: string[]
  /** The word in the other two languages, from the word pack: ["decidir"]. */
  translations?: Partial<Record<TargetLanguage, string[]>>
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
  | 'free_sentence' // write your own sentence with the word; graded by the AI layer
  | 'picture_choice' // see the word's picture → choose the word
  | 'dictation' // hear an example sentence → type the whole sentence
  | 'speak_word' // see the Turkish meaning → say the word aloud (speech recognition)
  | 'article_choice' // FR/ES noun without its article → choose le/la, el/la
  | 'conjugation' // FR/ES verb + subject → type the present-tense form
  | 'back_translation' // Turkish translation of an example → write it in the target language; AI-graded
  | 'idiom_complete' // idiom / phrasal verb with one word missing → choose it
  | 'family_choice' // a relative + the meaning → choose the right derived form (décision, not décidement)
  | 'aspect_choice' // FR/ES sentence with a time cue → passé composé or imparfait (indefinido or imperfecto)

/** Capabilities available to the engine at runtime. */
export interface EngineOptions {
  /** The AI layer is configured, so AI-graded exercises (free_sentence) may be scheduled. */
  ai?: boolean
  /** The browser can recognise speech, so spoken-answer exercises may be scheduled. */
  speech?: boolean
  /** Exercise types the learner has switched off (Settings → Sorular), never scheduled. */
  off?: ExerciseType[]
  /** Types the learner wants less of: still asked, but about a third as often as the others. */
  less?: ExerciseType[]
}

export type Direction =
  | 'target_to_native'
  | 'native_to_target'
  | 'context'
  | 'audio_to_native'
  | 'audio_to_target'
  | 'image_to_target'

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
  | 'false_friend' // gave the meaning of a look-alike word in another language (actuellement ≠ actually)
  | 'cross_language' // answered with a word from another of the learner's languages (consejo for conseil)

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
  /** Set by hand: true = retired, false = keep in routine reviews; unset = decided automatically. */
  retired?: boolean
}

export type ReviewMode = 'normal' | 'practice'

/** How sure the learner said they were before answering; absent when not asked. */
export type Confidence = 'sure' | 'unsure'

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
  confidence?: Confidence
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
  /** Made while the learner was sure: worth extra attention (hypercorrection effect). */
  highConfidence?: boolean
  resolved: boolean
}

/**
 * Epoch ms of a date value (0 when unknown or invalid). Read defensively: data from an old backup,
 * another device or a test clock can hold a Date, a string, a number or a plain object where text
 * is expected.
 */
export function timeOf(at: unknown): number {
  const ms = at instanceof Date ? at.getTime() : typeof at === 'string' || typeof at === 'number' ? new Date(at).getTime() : NaN
  return Number.isFinite(ms) ? ms : 0
}

/**
 * When a word was added, in ms (0 when unknown). Read defensively: data from an old backup, another
 * device or a test clock can hold a string or a plain object where a Date is expected, and one odd
 * entry must not break a sort for the whole list.
 */
export function addedTime(entry: { addedAt?: unknown }): number {
  return timeOf(entry.addedAt)
}
