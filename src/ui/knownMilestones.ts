import { State } from 'ts-fsrs'
import { localDate } from '../engine/progress'
import { readingKey } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'

/**
 * The known-word count, the main yardstick of extensive-reading tools (LingQ): words marked
 * known while reading plus list words that have graduated. Milestones give it a next target.
 */
const KNOWN_MILESTONES = [500, 1000, 2000, 3000, 5000, 7500, 10_000, 12_500, 15_000, 20_000, 25_000, 30_000, 40_000, 50_000]

export function knownTotal(known: ReadonlySet<string>, vocabulary: readonly VocabularyEntry[], states: readonly UserWordState[], language: TargetLanguage): number {
  const keys = new Set(known)
  const graduated = new Set(states.filter((s) => s.skills.recognition?.state === State.Review).map((s) => s.entryId))
  for (const e of vocabulary) if (e.language === language && graduated.has(e.id)) keys.add(readingKey(e.lemma, language))
  return keys.size
}

export function milestone(total: number): { from: number; to: number } {
  const to = KNOWN_MILESTONES.find((m) => m > total) ?? Math.ceil((total + 1) / 10_000) * 10_000
  const i = KNOWN_MILESTONES.indexOf(to)
  return { from: i > 0 ? KNOWN_MILESTONES[i - 1] : i === 0 ? 0 : to - 10_000, to }
}

/** Daily snapshots (kept short) so the card can say how much the count grew this week. */
export type KnownLog = { day: string; total: number }[]

export function weeklyGrowth(log: KnownLog, total: number, now = new Date()): number | null {
  const weekAgo = localDate(new Date(now.getTime() - 7 * 86_400_000))
  const base = [...log].reverse().find((x) => x.day <= weekAgo)
  return base ? total - base.total : null
}

export interface KnownGoal {
  target: number
  /** YYYY-MM-DD */
  by: string
}

export interface GoalForecast {
  /** Known words gained per day lately (null: not enough history yet). */
  pace: number | null
  /** When the target is reached at that pace. */
  eta: Date | null
  /** Words per day needed to make the date. */
  needed: number
  onTrack: boolean
  daysLeft: number
}

/** Pace from the daily snapshots of the last month (at least a week of them). */
export function goalForecast(log: KnownLog, total: number, goal: KnownGoal, now = new Date()): GoalForecast {
  const monthAgo = localDate(new Date(now.getTime() - 30 * 86_400_000))
  const base = log.find((x) => x.day >= monthAgo) ?? log[0]
  const days = base ? (now.getTime() - new Date(`${base.day}T12:00:00`).getTime()) / 86_400_000 : 0
  const pace = base && days >= 7 ? Math.max(0, (total - base.total) / days) : null
  const daysLeft = Math.max(0, Math.ceil((new Date(`${goal.by}T23:59:59`).getTime() - now.getTime()) / 86_400_000))
  const left = Math.max(0, goal.target - total)
  const eta = pace && pace > 0 ? new Date(now.getTime() + (left / pace) * 86_400_000) : left === 0 ? now : null
  return { pace, eta, needed: daysLeft ? Math.ceil(left / daysLeft) : left, onTrack: left === 0 || (!!eta && eta.getTime() <= new Date(`${goal.by}T23:59:59`).getTime()), daysLeft }
}
