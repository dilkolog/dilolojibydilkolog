import { createContext, useContext } from 'react'
import {
  achievements,
  computeXp,
  levelFromXp,
  longestStreakFromDays,
  perfectDays,
  type AchievementState,
  type GameStats,
  type LevelInfo,
  type XpSummary,
} from '../engine/gamification'
import { streakWithFreezes } from '../engine/insights'
import { repairOffer, type RepairOffer } from '../engine/streakRepair'
import { isRestDay } from '../engine/workload'
import { BOSS_XP } from '../engine/bosses'
import { ledgerByDay } from '../engine/xpLedger'
import { CHALLENGE_XP, challengeStatus, completedByWeek, type ChallengeStatus } from '../engine/challenges'
import type { JournalEntry } from '../data/db'
import { activityStats } from '../engine/badgeStats'
import { masteredForms, wholeVerbs } from '../engine/labProgress'
import { difficultWords } from '../engine/difficult'
import { MASTERY_STAGES, masteryStage } from '../engine/mastery'
import { localDate } from '../engine/progress'
import { dayMetrics, questStatus, type QuestStatus } from '../engine/quests'
import { CORE_TENSES } from './verbs/labShared'
import type { KelimeDB } from '../data/db'
import { isRead } from '../engine/guideReview'
import { loadPlacement } from './guidePlacementStore'

export interface GameState {
  xp: XpSummary
  level: LevelInfo
  streak: number
  /** Streak freezes in reserve. */
  freezes: number
  /** Yesterday was saved by a freeze (shown as frost on the flame). */
  frozenYesterday?: boolean
  /** Today's three quests. */
  quests: QuestStatus[]
  /** This week's three challenges. */
  weekly: ChallengeStatus[]
  /** A lost streak that the recall exam can still win back. */
  repair?: RepairOffer | null
  stats: GameStats
  achievements: AchievementState[]
}

const cache = new WeakMap<KelimeDB, { writes: number; day: string; result: Promise<GameState> }>()

/**
 * Everything gamified is derived from the stored history, across all languages. Reading all of it is
 * the heavy part of a reload, so the result is kept until something is written or the day turns over
 * (a language switch or a sync that changed nothing asks again for the same thing).
 */
export function loadGame(db: KelimeDB, now = new Date()): Promise<GameState> {
  const writes = db.writes
  const day = localDate(now)
  const hit = cache.get(db)
  if (hit && hit.writes === writes && hit.day === day) return hit.result
  // A write that lands while it is being computed makes the stored entry stale (its key is the count at the start).
  const result = computeGame(db, now)
  cache.set(db, { writes, day, result })
  result.catch(() => cache.get(db)?.result === result && cache.delete(db))
  return result
}

async function computeGame(db: KelimeDB, now: Date): Promise<GameState> {
  const [events, states, vocabulary, wins, library, journal, settings, mistakes, labFr, labEs, badgeLog, ledger, guideMarks, placementMeta] = await Promise.all([
    db.allEvents(),
    db.wordStates.toArray(),
    db.vocabulary.toArray(),
    db.getBossWins(),
    db.texts.toArray(),
    db.meta.get('journal').then((r) => (r?.value as JournalEntry[] | undefined) ?? []),
    db.getSettings(),
    db.mistakes.toArray(),
    db.getLab('fr'),
    db.getLab('es'),
    db.getBadgeLog(),
    db.getXpLedger(),
    db.getGuideMarks(),
    db.meta.get('guidePlacementDone'),
  ])
  const xp = computeXp(events, states.map((s) => s.introducedAt), now)
  // Beating a boss is worth a fixed bonus, counted on the day it happened.
  for (const w of wins) {
    const day = localDate(new Date(w.at))
    xp.total += BOSS_XP
    xp.byDay.set(day, (xp.byDay.get(day) ?? 0) + BOSS_XP)
    if (day === localDate(now)) xp.today += BOSS_XP
  }
  // Answers given in the verb lab earn XP too (its own ledger: they are not review events).
  for (const lab of [labFr, labEs]) {
    for (const [day, n] of Object.entries(lab.xp ?? {})) {
      xp.total += n
      xp.byDay.set(day, (xp.byDay.get(day) ?? 0) + n)
      if (day === localDate(now)) xp.today += n
    }
  }
  // Time read and listened, lessons learned: awards written down as they were earned.
  for (const [day, n] of ledgerByDay(ledger)) {
    xp.total += n
    xp.byDay.set(day, (xp.byDay.get(day) ?? 0) + n)
    if (day === localDate(now)) xp.today += n
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
  const today = localDate(now)

  let realCount = 0
  let freeSentencesCorrect = 0
  const languagesStudied = new Set<string>()
  const studyDaysSet = new Set<string>()
  const todayEvents: typeof events[number][] = []

  for (const e of events) {
    const isNormal = e.mode === 'normal'
    const day = localDate(e.timestamp)
    if (isNormal) {
      realCount++
      languagesStudied.add(e.language)
      studyDaysSet.add(day)
      if (e.exerciseType === 'free_sentence' && e.verdict === 'correct') freeSentencesCorrect++
    }
    if (day === today) todayEvents.push(e)
  }
  const studyDays = [...studyDaysSet].sort()
  const todayIntroductions = states.filter((s) => localDate(s.introducedAt) === today).length

  // "Sağlam" and beyond: the word has stood on its own for a while.
  const strongIds = new Set(states.filter((s) => MASTERY_STAGES.indexOf(masteryStage(s)) >= 3).map((s) => s.entryId))
  const hard = difficultWords(vocabulary)
  const ledgerLessons = Object.keys(ledger).filter((k) => k.startsWith('lesson|')).length
  const marksLessons = Object.values(guideMarks).filter((m) => isRead(m) && m.learned).length
  const guideLessonsLearned = Math.max(ledgerLessons, marksLessons)
  const guideCertsEarned = Object.keys(ledger).filter((k) => k.startsWith('cert|')).length
  const hasStoredPlacement = (['fr', 'es', 'en'] as const).some((lang) => !!loadPlacement(lang))
  const guidePlacementDone = (placementMeta?.value || hasStoredPlacement) ? 1 : 0
  const stats: GameStats = {
    ...activityStats(events),
    wordsAdded: vocabulary.filter((v) => v.source !== 'sample').length,
    wordsWithNotes: vocabulary.filter((v) => v.notes?.trim()).length,
    wordsStrong: strongIds.size,
    hardMarked: hard.length,
    hardConquered: hard.filter((v) => strongIds.has(v.id)).length,
    textsRead: library.filter((t) => t.history.length > 0).length,
    journalEntries: journal.length,
    mistakesFixed: mistakes.filter((m) => m.resolved).length,
    formsPracticed: Object.keys(labFr.records).length + Object.keys(labEs.records).length,
    formsMastered: masteredForms(labFr) + masteredForms(labEs),
    verbsMastered: wholeVerbs(labFr, CORE_TENSES.fr) + wholeVerbs(labEs, CORE_TENSES.es),
    tourDays: new Set([...(labFr.tourDays ?? []), ...(labEs.tourDays ?? [])]).size,
    totalXp: xp.total,
    wordsIntroduced: states.length,
    mastered: states.filter((s) => masteryStage(s) === 'mastered').length,
    totalAnswers: realCount,
    longestStreak: longestStreakFromDays(studyDays),
    perfectDays: perfectDays(events),
    maxCombo: xp.maxCombo,
    languagesStudied: languagesStudied.size,
    wordsWithPicture: vocabulary.filter((v) => v.imageId).length,
    wordsWithRecording: vocabulary.filter((v) => v.audioId).length,
    freeSentencesCorrect,
    level: level.level,
    bossesDefeated: wins.length,
    challengesDone: [...weeks.values()].reduce((a, b) => a + b, 0),
    perfectWeeks: [...weeks.values()].filter((n) => n >= 3).length,
    guideLessonsLearned,
    guideCertsEarned,
    guidePlacementDone,
  }
  const isRest = (day: string) => !!settings && isRestDay(new Date(`${day}T12:00:00`), settings)
  const repaired = new Set(settings?.repairedDays ?? [])
  const streak = streakWithFreezes(studyDays, now, (day) => isRest(day) || repaired.has(day))
  const quests = questStatus(today, dayMetrics(todayEvents, todayIntroductions))
  // Longest streak counts freeze-covered days too, so a frozen day never lowers the record.
  stats.longestStreak = Math.max(stats.longestStreak, streak.streak)
  return { xp, level, streak: streak.streak, freezes: streak.freezes, frozenYesterday: streak.frozenDays.includes(localDate(new Date(now.getTime() - 86_400_000))), quests, weekly: challengeStatus(activity, now), stats, achievements: achievements(stats, badgeLog), repair: repairOffer(studyDays, now, isRest, settings?.repairedDays) }
}

export const GameContext = createContext<GameState | null>(null)
export const useGame = () => useContext(GameContext)
