import { masteryStage, MASTERY_STAGES } from './mastery'
import type { CefrLevel, UserWordState, VocabularyEntry, WordList } from './types'

/**
 * Word lists (Memrise-style courses) and levels.
 *
 * A list is studied in sections of SECTION_SIZE words, in the order they were added, so a
 * session's new words come from one topic at a time when the list is in focus (see dailyPlan).
 */
export const SECTION_SIZE = 15

export const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/**
 * The level of a word from how frequent it is, unless the learner set it. Bands follow the rough
 * vocabulary sizes reported per CEFR level (Milton 2010: about 1000 words for A1, 2000 for A2,
 * 3000–3500 for B1, 4000–5000 for B2, more beyond): a word among the 1000 most frequent is
 * met at A1, and so on. Approximate by nature; a word outside the frequency list is C2,
 * an unknown rank has no level. Sample words carry a level set by hand.
 */
export function levelOf(entry: VocabularyEntry): CefrLevel | null {
  if (entry.levelSet || entry.source === 'sample') return entry.cefr
  const r = entry.frequencyRank
  if (r < 0) return 'C2'
  if (!r) return null
  return r <= 1000 ? 'A1' : r <= 2000 ? 'A2' : r <= 3500 ? 'B1' : r <= 5000 ? 'B2' : r <= 8000 ? 'C1' : 'C2'
}

const added = (e: VocabularyEntry) => e.addedAt?.getTime() ?? 0

/** The words of a list in study order (as they were added). */
export function listWords(list: Pick<WordList, 'id'>, vocabulary: readonly VocabularyEntry[]): VocabularyEntry[] {
  return vocabulary.filter((e) => e.listId === list.id).sort((a, b) => added(a) - added(b) || a.id.localeCompare(b.id))
}

/** Consecutive sections of SECTION_SIZE words. */
export function sections<T>(words: readonly T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < words.length; i += SECTION_SIZE) out.push(words.slice(i, i + SECTION_SIZE))
  return out
}

export interface GroupProgress {
  total: number
  /** Introduced (met at least once). */
  met: number
  /** At the last two growth stages (in bloom). */
  learned: number
}

export function progressOf(words: readonly VocabularyEntry[], stateById: ReadonlyMap<string, UserWordState>): GroupProgress {
  const strong = new Set(MASTERY_STAGES.slice(-2))
  let met = 0
  let learned = 0
  for (const w of words) {
    const s = stateById.get(w.id)
    if (!s) continue
    met++
    if (strong.has(masteryStage(s))) learned++
  }
  return { total: words.length, met, learned }
}

/** The section the learner is in: the first one with a word not met yet (1-based), or null when all are met. */
export function currentSection(words: readonly VocabularyEntry[], stateById: ReadonlyMap<string, UserWordState>): { index: number; count: number } | null {
  const all = sections(words)
  const i = all.findIndex((sec) => sec.some((w) => !stateById.has(w.id)))
  return i < 0 ? null : { index: i + 1, count: all.length }
}
