import type { ContentLanguage, ContentLevel } from '../../../src/engine/contentTypes'

/** content/plan/<lang>.json: the curriculum matrix (docs/ICERIK-FABRIKASI.md §3). */
export interface ContentPlan {
  language: ContentLanguage
  levels: Record<ContentLevel, { words: [number, number]; sentenceWords: number; topics: string[] }>
  /**
   * The starter band of A1 (texts marked `starter`): a learner who knows a language's first few hundred words reads
   * them. A word fits when its frequency rank is within `rank`, or when it is an A1 word within `a1Rank` (the frequency
   * lists come from film subtitles: "pain" or "samedi" rank past 1500, yet every course teaches them first);
   * `fit`: the share of the text's words that must.
   */
  starter?: { words: [number, number]; sentenceWords: number; rank: number; a1Rank: number; fit: number }
  themes: { id: string; tr: string }[]
  genres: { id: string; tr: string }[]
  /** Sub-skills a grammar job spreads its questions over: per topic, or the default. */
  subskills: Record<string, string[]>
  targets: { reading: { perCell: number }; grammar: { perTopicLevel: number } }
  jobSize: { reading: number; grammar: number }
}

export type ContentKind = 'reading' | 'grammar'

/** content/jobs/<lang>/<kind>/<id>.json: one gap of the matrix to fill. */
export interface ContentJob {
  id: string
  language: ContentLanguage
  kind: ContentKind
  level: ContentLevel
  /** Reading: the cell. */
  theme?: string
  genre?: string
  /** Reading: the grammar topics to use on purpose; grammar: the one topic. */
  grammar: string[]
  count: number
  /** Reading: starter texts (the plan's starter band, A1); every item of the job is marked `starter`. */
  starter?: boolean
  /** Grammar: what to spread the questions over. */
  subskills?: string[]
  /** The item numbers this job may use (inclusive): no two jobs share one, so agents never collide. */
  ids: { from: number; to: number }
  createdAt: string
  claimedBy?: string
  claimedAt?: string
}

export interface CheckIssue {
  id: string
  reasons: string[]
}

/** content/reports/<job>.json */
export interface CheckReport {
  job: string
  language: ContentLanguage
  kind: ContentKind
  total: number
  accepted: string[]
  rejected: CheckIssue[]
  warnings: CheckIssue[]
  rate: number
  /** The solver pass (§5.2), when it ran. */
  solver?: { checked: number; disagreements: number; rate: number }
}

/** The automatic check must pass this share of a batch before it is committed (§5.3). */
export const ACCEPT_RATE = 0.95
