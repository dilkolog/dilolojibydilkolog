import { masteryStage, MASTERY_STAGES } from './mastery'
import type { ListLevel, UserWordState, VocabularyEntry, WordList } from './types'

/**
 * Word lists, like courses on Memrise: a list holds the learner's own levels (named categories
 * in an order they choose), and each word sits in one list and, optionally, one of its levels.
 * When a list is in focus, its new words come level by level (see dailyPlan).
 */

const added = (e: VocabularyEntry) => e.addedAt?.getTime() ?? 0

/** Where a word stands in its list's order: its level's position; words with no level last. */
export function levelRank(list: Pick<WordList, 'levels'> | undefined, e: VocabularyEntry): number {
  const i = list?.levels?.findIndex((l) => l.id === e.levelId) ?? -1
  return i < 0 ? Number.MAX_SAFE_INTEGER : i
}

/** The words of a list in study order: level by level, each in the order added. */
export function listWords(list: Pick<WordList, 'id' | 'levels'>, vocabulary: readonly VocabularyEntry[]): VocabularyEntry[] {
  return vocabulary
    .filter((e) => e.listId === list.id)
    .sort((a, b) => levelRank(list, a) - levelRank(list, b) || added(a) - added(b) || a.id.localeCompare(b.id))
}

export interface LevelGroup {
  /** null: the list's words with no level (or a level since deleted). */
  level: ListLevel | null
  words: VocabularyEntry[]
}

/** The list's levels with their words, in order (empty levels too), then the words with no level. */
export function levelGroups(list: Pick<WordList, 'id' | 'levels'>, vocabulary: readonly VocabularyEntry[]): LevelGroup[] {
  const words = listWords(list, vocabulary)
  const levels = list.levels ?? []
  const known = new Set(levels.map((l) => l.id))
  const groups: LevelGroup[] = levels.map((level) => ({ level, words: words.filter((w) => w.levelId === level.id) }))
  const rest = words.filter((w) => !w.levelId || !known.has(w.levelId))
  return rest.length ? [...groups, { level: null, words: rest }] : groups
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

/** The level the learner is in: the first group with a word not met yet, or null when all are met. */
export function currentLevel(groups: readonly LevelGroup[], stateById: ReadonlyMap<string, UserWordState>): { index: number; level: ListLevel | null } | null {
  const index = groups.findIndex((g) => g.words.some((w) => !stateById.has(w.id)))
  return index < 0 ? null : { index, level: groups[index].level }
}

export const newLevelId = () => `lvl:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
