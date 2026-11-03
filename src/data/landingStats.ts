import type { TargetLanguage } from '../engine/types'
import type { GuideLevel } from './guide/lessonTypes'
import stats from './landingStats.json'

/** What the landing page counts for each language, from the app's own content (landingStats.test.ts keeps it true). */
export interface LanguageStats {
  lessons: number
  levels: Record<GuideLevel, number>
  /** A1–A2, B1–B2, C1: how many lessons, the first few titles on the path, one example sentence. */
  bands: Record<'A' | 'B' | 'C', { lessons: number; titles: string[]; example: { text: string; tr: string } }>
  grammar: number
  dialogues: number
  exam: number
  audiobooks: number
  storybooks: number
  traps: number
  verbs: number
}
export type LandingStats = Record<TargetLanguage, LanguageStats>

export const LANDING_STATS = stats as LandingStats
