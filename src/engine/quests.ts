import { EXERCISES } from './exercises'
import { localDate } from './progress'
import { createRng, shuffle } from './rng'
import type { ReviewEvent } from './types'

/**
 * Daily quests: three small, varied goals each day. The set is chosen deterministically from the
 * date and progress is recomputed from that day's answers, so nothing has to be stored and the
 * bonus XP can never drift from what actually happened.
 */
export type QuestMetric = 'answers' | 'correct' | 'combo' | 'typedCorrect' | 'listenCorrect' | 'newWords' | 'noHintCorrect'

export interface QuestDef {
  id: QuestMetric
  icon: string
  title: (n: number) => string
  /** Possible targets; one is picked per day. All ≥ 3 so a quest always takes some effort. */
  targets: number[]
  xp: number
}

export const QUESTS: QuestDef[] = [
  { id: 'answers', icon: '✍️', title: (n) => `${n} soru cevapla`, targets: [20, 30, 50], xp: 20 },
  { id: 'correct', icon: '🎯', title: (n) => `${n} doğru cevap ver`, targets: [15, 25, 40], xp: 25 },
  { id: 'combo', icon: '🔥', title: (n) => `Üst üste ${n} doğru yap`, targets: [5, 8, 12], xp: 30 },
  { id: 'typedCorrect', icon: '⌨️', title: (n) => `Yazarak ${n} doğru cevap ver`, targets: [5, 10, 15], xp: 30 },
  { id: 'listenCorrect', icon: '🎧', title: (n) => `Dinleme sorularında ${n} doğru`, targets: [5, 8, 12], xp: 25 },
  { id: 'newWords', icon: '🌱', title: (n) => `${n} yeni kelimeyle tanış`, targets: [3, 5, 8], xp: 20 },
  { id: 'noHintCorrect', icon: '🧠', title: (n) => `İpucusuz ${n} doğru`, targets: [10, 20, 30], xp: 25 },
]

export type DayMetrics = Record<QuestMetric, number>

const daySeed = (date: string) => Number(date.replace(/-/g, ''))

export function dailyQuests(date: string): { def: QuestDef; target: number }[] {
  const rng = createRng(daySeed(date))
  return shuffle(QUESTS, rng)
    .slice(0, 3)
    .map((def) => ({ def, target: def.targets[Math.floor(rng() * def.targets.length)] }))
}

/** One day's quest metrics from that day's real (non-practice) answers and introductions. */
export function dayMetrics(events: readonly ReviewEvent[], introductions: number): DayMetrics {
  const sorted = [...events].filter((e) => e.mode === 'normal').sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  let run = 0
  let combo = 0
  const m: DayMetrics = { answers: 0, correct: 0, combo: 0, typedCorrect: 0, listenCorrect: 0, newWords: introductions, noHintCorrect: 0 }
  for (const e of sorted) {
    m.answers++
    const right = e.verdict !== 'wrong'
    run = right ? run + 1 : 0
    combo = Math.max(combo, run)
    if (!right) continue
    m.correct++
    if (EXERCISES[e.exerciseType].input === 'typed') m.typedCorrect++
    if (e.skill === 'listening') m.listenCorrect++
    if (e.hintsUsed === 0) m.noHintCorrect++
  }
  m.combo = combo
  return m
}

export interface QuestStatus {
  id: QuestMetric
  icon: string
  title: string
  target: number
  value: number
  done: boolean
  xp: number
}

export function questStatus(date: string, metrics: DayMetrics): QuestStatus[] {
  return dailyQuests(date).map(({ def, target }) => ({
    id: def.id,
    icon: def.icon,
    title: def.title(target),
    target,
    value: Math.min(metrics[def.id], target),
    done: metrics[def.id] >= target,
    xp: def.xp,
  }))
}

/** Bonus XP earned from completed quests, per local day. */
export function questBonus(events: readonly ReviewEvent[], introductions: readonly Date[]): Map<string, number> {
  const byDay = new Map<string, ReviewEvent[]>()
  for (const e of events) byDay.set(localDate(e.timestamp), [...(byDay.get(localDate(e.timestamp)) ?? []), e])
  const intros = new Map<string, number>()
  for (const d of introductions) intros.set(localDate(d), (intros.get(localDate(d)) ?? 0) + 1)
  const days = new Set([...byDay.keys(), ...intros.keys()])
  const bonus = new Map<string, number>()
  for (const day of days) {
    const xp = questStatus(day, dayMetrics(byDay.get(day) ?? [], intros.get(day) ?? 0))
      .filter((q) => q.done)
      .reduce((s, q) => s + q.xp, 0)
    if (xp) bonus.set(day, xp)
  }
  return bonus
}
