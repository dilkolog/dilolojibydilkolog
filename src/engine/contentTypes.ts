import type { GrammarExercise, GrammarLevel } from './grammar'

/**
 * The content factory's shapes (docs/ICERIK-FABRIKASI.md): what agents write (content/raw), what the build
 * publishes (public/content/<lang>/) and what the app reads (src/data/content.ts). Shared by the tools and the app.
 */
export type ContentLanguage = 'fr' | 'es'
export type ContentLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
export const CONTENT_LEVELS: ContentLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']

export interface ReadingQuestion {
  /** In Turkish. */
  q: string
  options: string[]
  answer: number
  /** Where the text says it, in Turkish. */
  why: string
}

export interface ReadingItem {
  /** "fr-r-000123": language, kind and number; never changes, never reused. */
  id: string
  language: ContentLanguage
  level: ContentLevel
  /** A plan theme id. */
  theme: string
  /** A plan genre id. */
  genre: string
  /** The grammar topics the text uses on purpose (TOPIC_NAME keys). */
  grammar: string[]
  /** A bounded introductory series; ordinary A1 content keeps its existing rules. */
  firstStep?: { series: string; position: number; length: number }
  title: string
  paragraphs: string[]
  /** Each paragraph's Turkish. */
  tr: string[]
  vocabulary: { word: string; lemma: string; tr: string }[]
  questions: ReadingQuestion[]
  source: 'Diloloji (özgün)'
  /** The job it was written for. */
  batch: string
  /** A starter text (A1 only): written from the language's most frequent words, for a learner's first weeks. */
  starter?: boolean
}

/** A grammar question as the factory keeps it: the app's question with a few more fields. */
export interface ContentGrammar extends GrammarExercise {
  language: ContentLanguage
  level: GrammarLevel
  /** 1–5, finer than the level. */
  difficulty: number
  batch: string
  /** One of the job's sub-skills. */
  subskill?: string
  /** The reading text it was made from. */
  fromText?: string
}

/** One published file: where it is, how big, and which ids it holds (runs in id order, so an id finds its file). */
export interface ShardInfo {
  path: string
  count: number
  bytes: number
  gzip: number
  ranges: [string, string][]
}

export interface ContentManifest {
  language: ContentLanguage
  /** A digest of every file: a new one means new content. */
  version: string
  counts: {
    reading: { total: number; byLevel: Record<string, number>; byTheme: Record<string, number>; byGenre: Record<string, number> }
    grammar: { total: number; byTopic: Record<string, number>; byLevel: Record<string, number> }
  }
  /** Reading files by level. */
  reading: Partial<Record<ContentLevel, ShardInfo[]>>
  /** Grammar files by topic. */
  grammar: Record<string, ShardInfo[]>
  /** Ids taken out: never asked in a new round, kept in the learner's log without error. */
  retired: string[]
}

/** A reading text as a file holds it (the job is the factory's business). */
export type PublishedReading = Omit<ReadingItem, 'batch' | 'source'>
export type PublishedGrammar = Omit<ContentGrammar, 'batch'>

/** The file of a kind that holds an id, when there is one. */
export function shardOf(shards: readonly ShardInfo[], id: string): ShardInfo | undefined {
  return shards.find((s) => s.ranges.some(([a, b]) => id >= a && id <= b))
}
