import { openMistakes } from './mistakes'
import type { Mistake, UserWordState, VocabularyEntry } from './types'

/**
 * Boss battles: the words that won't stick (leeches) become bosses with hit points. A battle is a
 * run of different questions on that one word; it turns a frustrating word into a challenge.
 */

export interface BossWin {
  entryId: string
  /** ISO date. */
  at: string
  /** The word's wrong-answer count when it was beaten: more wrongs later bring the boss back. */
  wrongAtWin: number
}

export interface Boss {
  entry: VocabularyEntry
  hp: number
  wrong: number
  /** Beaten before and back for a rematch. */
  rematch: boolean
}

/** Damage per correct answer: producing the word hits harder than recognising it. */
export const DAMAGE = { choice: 1, typed: 2 } as const
export const PLAYER_HEARTS = 3
/** Bonus XP for beating a boss. */
export const BOSS_XP = 40

export function findBosses(
  vocabulary: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  mistakes: readonly Mistake[],
  wins: readonly BossWin[],
  limit = 6,
): Boss[] {
  const byId = new Map(vocabulary.map((v) => [v.id, v]))
  const lastWin = new Map<string, BossWin>()
  for (const w of wins) if (!lastWin.has(w.entryId) || w.at > lastWin.get(w.entryId)!.at) lastWin.set(w.entryId, w)
  const out: Boss[] = []
  for (const s of states) {
    const entry = byId.get(s.entryId)
    if (!entry) continue
    const { wrong, reviews } = s.stats
    const open = openMistakes(mistakes, s.entryId).length
    const leech = (wrong >= 3 && wrong / Math.max(1, reviews) >= 0.3) || s.stats.consecutiveWrong >= 2 || open >= 2
    if (!leech) continue
    const win = lastWin.get(s.entryId)
    if (win && wrong <= win.wrongAtWin) continue
    out.push({ entry, hp: 4 + Math.min(6, wrong), wrong, rematch: !!win })
  }
  return out.sort((a, b) => b.wrong - a.wrong).slice(0, limit)
}
