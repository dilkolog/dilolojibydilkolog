import { createContext, useContext } from 'react'
import {
  achievements,
  computeXp,
  levelFromXp,
  longestStreak,
  perfectDays,
  type AchievementState,
  type GameStats,
  type LevelInfo,
  type XpSummary,
} from '../engine/gamification'
import { masteryStage } from '../engine/mastery'
import { studyStreak } from '../engine/progress'
import type { KelimeDB } from '../data/db'

export interface GameState {
  xp: XpSummary
  level: LevelInfo
  streak: number
  stats: GameStats
  achievements: AchievementState[]
}

/** Everything gamified is derived from the stored history, across all languages. */
export async function loadGame(db: KelimeDB, now = new Date()): Promise<GameState> {
  const [events, states, vocabulary] = await Promise.all([db.events.toArray(), db.wordStates.toArray(), db.vocabulary.toArray()])
  const xp = computeXp(events, states.map((s) => s.introducedAt), now)
  const level = levelFromXp(xp.total)
  const real = events.filter((e) => e.mode === 'normal')
  const stats: GameStats = {
    wordsIntroduced: states.length,
    mastered: states.filter((s) => masteryStage(s) === 'mastered').length,
    totalAnswers: real.length,
    longestStreak: longestStreak(events),
    perfectDays: perfectDays(events),
    maxCombo: xp.maxCombo,
    languagesStudied: new Set(real.map((e) => e.language)).size,
    wordsWithPicture: vocabulary.filter((v) => v.imageId).length,
    wordsWithRecording: vocabulary.filter((v) => v.audioId).length,
    freeSentencesCorrect: real.filter((e) => e.exerciseType === 'free_sentence' && e.verdict === 'correct').length,
    level: level.level,
  }
  return { xp, level, streak: studyStreak(events, now), stats, achievements: achievements(stats) }
}

export const GameContext = createContext<GameState | null>(null)
export const useGame = () => useContext(GameContext)
