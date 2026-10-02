import { describe, expect, it } from 'vitest'
import { CHALLENGES, challengeStatus, completedByWeek, weeklyChallenges, weekMetrics } from '../challenges'
import { weekStart } from '../race'
import type { ReviewEvent } from '../types'

const MON = weekStart(new Date('2026-10-01T10:00:00'))
const ev = (day: number, verdict: 'correct' | 'wrong' = 'correct', exerciseType = 'typed_translation') =>
  ({ timestamp: new Date(MON.getTime() + day * 86_400_000 + 10 * 3600_000), mode: 'normal', verdict, exerciseType }) as ReviewEvent
const empty = { events: [], introductions: [], bossWins: [], textsRead: [], journalEntries: [] }

describe('weekly challenges', () => {
  it('picks three different challenges per week, the same all week', () => {
    const a = weeklyChallenges(MON)
    expect(a).toHaveLength(3)
    expect(new Set(a.map((c) => c.def.id)).size).toBe(3)
    expect(weeklyChallenges(MON).map((c) => c.def.id)).toEqual(a.map((c) => c.def.id))
    for (const c of a) expect(CHALLENGES.find((d) => d.id === c.def.id)!.targets).toContain(c.target)
  })

  it('measures only this week’s real activity', () => {
    const m = weekMetrics({ ...empty, events: [ev(0), ev(0, 'wrong'), ev(2, 'correct', 'mc_meaning'), ev(-1), { ...ev(1), mode: 'practice' } as ReviewEvent], journalEntries: [new Date(MON.getTime() + 3600_000)] }, MON)
    expect(m).toMatchObject({ answers: 3, studyDays: 2, typedCorrect: 1, journalEntries: 1, newWords: 0 })
  })

  it('reports completion and credits completed challenges to their week', () => {
    // Plenty of everything: every challenge of the week is done.
    const lots = { events: Array.from({ length: 420 }, (_, i) => ev(i % 7)), introductions: Array.from({ length: 40 }, () => MON), bossWins: [MON, MON, MON], textsRead: [MON, MON, MON], journalEntries: Array.from({ length: 5 }, () => MON) }
    const now = new Date(MON.getTime() + 6 * 86_400_000)
    expect(challengeStatus(lots, now).every((c) => c.done)).toBe(true)
    expect([...completedByWeek(lots, now).values()]).toEqual([3])
    expect(completedByWeek(empty, now).size).toBe(0)
  })
})
