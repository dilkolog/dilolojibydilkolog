import { EXERCISES } from './exercises'
import { localDate } from './progress'
import { weekStart } from './race'
import { createRng, shuffle } from './rng'
import type { ReviewEvent } from './types'

/**
 * Weekly challenges: three bigger goals per week on top of the daily quests, chosen
 * deterministically from the week, so nothing is stored and the reward can't drift.
 */
export type ChallengeMetric = 'answers' | 'studyDays' | 'newWords' | 'bossWins' | 'textsRead' | 'journalEntries' | 'typedCorrect'

interface ChallengeDef {
  id: ChallengeMetric
  icon: string
  title: (n: number) => string
  targets: number[]
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'answers', icon: '🎯', title: (n) => `Bu hafta ${n} soru cevapla`, targets: [150, 250, 400] },
  { id: 'studyDays', icon: '📅', title: (n) => `${n} farklı gün çalış`, targets: [5, 6, 7] },
  { id: 'newWords', icon: '🌱', title: (n) => `${n} yeni kelimeyle tanış`, targets: [15, 25, 40] },
  { id: 'bossWins', icon: '⚔️', title: (n) => `${n} boss yen`, targets: [1, 2, 3] },
  { id: 'textsRead', icon: '📖', title: (n) => `${n} metin okuyup bitir`, targets: [1, 2, 3] },
  { id: 'journalEntries', icon: '✍️', title: (n) => `Günlüğe ${n} kez yaz`, targets: [2, 3, 5] },
  { id: 'typedCorrect', icon: '⌨️', title: (n) => `Yazarak ${n} doğru cevap ver`, targets: [50, 100, 150] },
]

/** Bonus XP per completed weekly challenge. */
export const CHALLENGE_XP = 60

export interface WeekActivity {
  events: readonly ReviewEvent[]
  introductions: readonly Date[]
  bossWins: readonly Date[]
  textsRead: readonly Date[]
  journalEntries: readonly Date[]
}

export type WeekMetrics = Record<ChallengeMetric, number>

export function weeklyChallenges(start: Date): { def: ChallengeDef; target: number }[] {
  const rng = createRng(Number(localDate(start).replace(/-/g, '')) * 7)
  return shuffle(CHALLENGES, rng)
    .slice(0, 3)
    .map((def) => ({ def, target: def.targets[Math.floor(rng() * def.targets.length)] }))
}

export function weekMetrics(a: WeekActivity, start: Date): WeekMetrics {
  const end = start.getTime() + 7 * 86_400_000
  const inWeek = (d: Date) => d.getTime() >= start.getTime() && d.getTime() < end
  const real = a.events.filter((e) => e.mode === 'normal' && inWeek(e.timestamp))
  return {
    answers: real.length,
    studyDays: new Set(real.map((e) => localDate(e.timestamp))).size,
    newWords: a.introductions.filter(inWeek).length,
    bossWins: a.bossWins.filter(inWeek).length,
    textsRead: a.textsRead.filter(inWeek).length,
    journalEntries: a.journalEntries.filter(inWeek).length,
    typedCorrect: real.filter((e) => e.verdict !== 'wrong' && EXERCISES[e.exerciseType].input === 'typed').length,
  }
}

export interface ChallengeStatus {
  id: ChallengeMetric
  icon: string
  title: string
  value: number
  target: number
  done: boolean
}

export function challengeStatus(a: WeekActivity, now: Date): ChallengeStatus[] {
  const start = weekStart(now)
  const m = weekMetrics(a, start)
  return weeklyChallenges(start).map(({ def, target }) => ({
    id: def.id,
    icon: def.icon,
    title: def.title(target),
    value: Math.min(m[def.id], target),
    target,
    done: m[def.id] >= target,
  }))
}

/** Completed challenges per week, by the week's Monday (local date). */
export function completedByWeek(a: WeekActivity, now: Date): Map<string, number> {
  const dates = [...a.events.map((e) => e.timestamp), ...a.introductions, ...a.bossWins, ...a.textsRead, ...a.journalEntries]
  const weeks = new Set(dates.map((d) => weekStart(d).getTime()))
  const out = new Map<string, number>()
  for (const w of weeks) {
    if (w > now.getTime()) continue
    const done = challengeStatus(a, new Date(w + 3 * 86_400_000)).filter((c) => c.done).length
    if (done) out.set(localDate(new Date(w)), done)
  }
  return out
}
