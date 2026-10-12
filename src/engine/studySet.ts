import { difficultWords } from './difficult'
import { shuffle, type Rng } from './rng'
import type { Scheduler } from './scheduler'
import { addedTime, type UserWordState, type VocabularyEntry } from './types'

/**
 * Which words a free study round takes and how its cards face: the same few choices wherever a
 * round of cards is started (flashcards, the practice test): the set, shuffled or not, which side
 * shows first, and how many.
 */
export type StudyScope = 'weak' | 'today' | 'all' | 'hard' | 'unlearned' | 'list'
export type StudyDirection = 'forward' | 'reverse' | 'mixed'

export interface StudyOptions {
  scope: StudyScope
  /** The list taken when `scope` is 'list'. */
  listId?: string
  shuffle: boolean
  /** forward: the word first, reverse: the meaning first, mixed: either, card by card. */
  direction: StudyDirection
  /** Cards in a round; 0 = every word of the set. */
  size: number
}

export const DEFAULT_STUDY: StudyOptions = { scope: 'weak', shuffle: false, direction: 'forward', size: 20 }

export const STUDY_SIZES = [10, 20, 40, 0] as const

export const SCOPE_NAME: Record<StudyScope, string> = {
  weak: 'En zayıflar',
  today: 'Bugün öğrendiklerim',
  all: 'Öğrendiklerimin hepsi',
  hard: 'Zor işaretliler',
  unlearned: 'Henüz çalışmadıklarım',
  list: 'Bir liste',
}

const added = addedTime

/**
 * The words of the chosen set, in the order they would be studied: the weakest first, or the order
 * they were added; shuffled when asked. Cut to `size` after the shuffle, so a shuffled set of 20 is
 * 20 from the whole set, not the first 20 mixed.
 */
export function selectStudyWords(
  vocabulary: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  scheduler: Scheduler,
  now: Date,
  options: StudyOptions,
  rng: Rng,
): VocabularyEntry[] {
  const byId = new Map(vocabulary.map((e) => [e.id, e]))
  const stateById = new Map(states.map((s) => [s.entryId, s]))
  const learned = (s: UserWordState) => byId.has(s.entryId) && Object.keys(s.skills).length > 0
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const weakest = (s: UserWordState) => Math.min(...Object.values(s.skills).map((c) => scheduler.retrievability(c, now)))
  const inOrder = (words: VocabularyEntry[]) => words.sort((a, b) => added(a) - added(b) || a.id.localeCompare(b.id))
  let words: VocabularyEntry[]
  switch (options.scope) {
    case 'weak':
      words = states.filter(learned).sort((a, b) => weakest(a) - weakest(b)).map((s) => byId.get(s.entryId)!)
      break
    case 'today':
      words = inOrder(states.filter((s) => learned(s) && s.introducedAt >= today).map((s) => byId.get(s.entryId)!))
      break
    case 'all':
      words = inOrder(states.filter(learned).map((s) => byId.get(s.entryId)!))
      break
    case 'hard':
      words = inOrder(difficultWords(vocabulary))
      break
    case 'unlearned':
      words = inOrder(vocabulary.filter((e) => !stateById.has(e.id) || !learned(stateById.get(e.id)!)))
      break
    case 'list':
      words = inOrder(vocabulary.filter((e) => !!options.listId && e.listId === options.listId))
      break
  }
  if (options.shuffle) words = shuffle(words, rng)
  return options.size > 0 ? words.slice(0, options.size) : words
}

export interface Card {
  entry: VocabularyEntry
  /** The meaning is on the front and the word on the back. */
  reverse: boolean
}

/** The words as cards, each facing the way `direction` says (mixed: decided card by card). */
export function dealCards(words: readonly VocabularyEntry[], direction: StudyDirection, rng: Rng): Card[] {
  return words.map((entry) => ({ entry, reverse: direction === 'reverse' || (direction === 'mixed' && rng() < 0.5) }))
}
