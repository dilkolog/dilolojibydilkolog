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
import { BOSS_XP } from '../engine/bosses'
import { CHALLENGE_XP, challengeStatus, completedByWeek, type ChallengeStatus } from '../engine/challenges'
import type { JournalEntry, ReadingText } from '../data/db'
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
  /** This week's three challenges. */
  weekly: ChallengeStatus[]
  stats: GameStats
  achievements: AchievementState[]
}

/** Everything gamified is derived from the stored history, across all languages. */
export async function loadGame(db: KelimeDB, now = new Date()): Promise<GameState> {
  const [events, states, vocabulary, wins, library, journal] = await Promise.all([
    db.events.toArray(),
    db.wordStates.toArray(),
    db.vocabulary.toArray(),
    db.getBossWins(),
    db.meta.get('library').then((r) => (r?.value as ReadingText[] | undefined) ?? []),
    db.meta.get('journal').then((r) => (r?.value as JournalEntry[] | undefined) ?? []),
  ])
  const xp = computeXp(events, states.map((s) => s.introducedAt), now)
  // Beating a boss is worth a fixed bonus, counted on the day it happened.
  for (const w of wins) {
    const day = localDate(new Date(w.at))
    xp.total += BOSS_XP
    xp.byDay.set(day, (xp.byDay.get(day) ?? 0) + BOSS_XP)
    if (day === localDate(now)) xp.today += BOSS_XP
  }
  const activity = {
    events,
    introductions: states.map((s) => s.introducedAt),
    bossWins: wins.map((w) => new Date(w.at)),
    textsRead: library.flatMap((t) => t.history.map((h) => new Date(h.at))),
    journalEntries: journal.map((j) => new Date(j.at)),
  }
  // Completed weekly challenges are credited to the Monday of their week.
  const weeks = completedByWeek(activity, now)
  for (const [monday, done] of weeks) {
    xp.total += done * CHALLENGE_XP
    xp.byDay.set(monday, (xp.byDay.get(monday) ?? 0) + done * CHALLENGE_XP)
    if (monday === localDate(now)) xp.today += done * CHALLENGE_XP
  }
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
    bossesDefeated: wins.length,
    challengesDone: [...weeks.values()].reduce((a, b) => a + b, 0),
    perfectWeeks: [...weeks.values()].filter((n) => n >= 3).length,
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
  return { xp, level, streak: streak.streak, freezes: streak.freezes, quests, weekly: challengeStatus(activity, now), stats, achievements: achievements(stats) }
}

export const GameContext = createContext<GameState | null>(null)
export const useGame = () => useContext(GameContext)
