import type { TargetLanguage } from '../engine/types'
import counts from './gameCounts.json'

/**
 * How much each game holds, for the cards on the Games screen ("24 kalıp · B1–C1"). Counted from the content by
 * gameCounts.test.ts, so the Games list does not have to load every game's data (all three languages of it) just
 * to print a number: a game's own data comes with the game, when it is opened.
 *   WRITE_GAME_COUNTS=1 npx vitest run src/data/gameCounts.test.ts
 */
export interface GameCounts {
  dialogues: number
  grammar: number
  spotErrors: number
  rewrites: number
  collocations: number
  traps: number
  confusables: number
  register: number
  flow: number
  exam: number
}

export const GAME_COUNTS = counts as Record<TargetLanguage, GameCounts> & { en: GameCounts & { irregularVerbs: number; phrasalVerbs: number } }
