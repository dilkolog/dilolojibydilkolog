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
import { streakWithFreezes } from '../engine/insights'
import { masteryStage } from '../engine/mastery'
import { localDate } from '../engine/progress'
import { dayMetrics, questStatus, type QuestStatus } from '../engine/quests'
import type { KelimeDB } from '../data/db'

export interface GameState {
  xp: XpSummary
  level: LevelInfo
  streak: number
  /** Streak freezes in reserve. */
  freezes: number
  /** Today's three quests. */
  quests: QuestStatus[]
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
  const studyDays = [...new Set(real.map((e) => localDate(e.timestamp)))]
  const streak = streakWithFreezes(studyDays, now)
  const today = localDate(now)
  const quests = questStatus(
    today,
    dayMetrics(
      events.filter((e) => localDate(e.timestamp) === today),
      states.filter((s) => localDate(s.introducedAt) === today).length,
    ),
  )
  // Longest streak counts freeze-covered days too, so a frozen day never lowers the record.
  stats.longestStreak = Math.max(stats.longestStreak, streak.streak)
  return { xp, level, streak: streak.streak, freezes: streak.freezes, quests, stats, achievements: achievements(stats) }
}

export const GameContext = createContext<GameState | null>(null)
export const useGame = () => useContext(GameContext)
