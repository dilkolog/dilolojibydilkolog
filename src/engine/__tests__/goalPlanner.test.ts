import { describe, expect, it } from 'vitest'
import { calculateGoalProgress, MAX_DAILY_NEW, type CefrGoal } from '../goalPlanner'
import type { LevelCoverage } from '../cefrLevels'

const NOW = new Date('2026-10-20T12:00:00Z')

const MOCK_COVERAGE: LevelCoverage[] = [
  { level: 'A1', total: 400, known: 380, learning: 20 },
  { level: 'A2', total: 600, known: 200, learning: 100 },
  { level: 'B1', total: 1000, known: 100, learning: 50 },
  { level: 'B2', total: 1500, known: 0, learning: 0 },
]

describe('calculateGoalProgress', () => {
  it('calculates progress, remaining words, and suggested daily quota correctly for an A2 goal', () => {
    const goal: CefrGoal = {
      level: 'A2',
      targetDate: '2026-11-19', // ~30 days from 2026-10-20
      createdAt: '2026-10-01',
    }

    // A1 required = ceil(400 * 0.85) = 340. Known capped at 340.
    // A2 required = ceil(600 * 0.85) = 510. Known = 200.
    // Total required = 850. Total known = 540.
    // Remaining = 310.
    const progress = calculateGoalProgress(goal, MOCK_COVERAGE, 5, NOW)

    expect(progress.wordsRequired).toBe(850)
    expect(progress.wordsKnown).toBe(540)
    expect(progress.wordsRemaining).toBe(310)
    expect(progress.percent).toBe(64)
    expect(progress.daysRemaining).toBe(31) // Oct 20 to Nov 19 ~ 30-31 days
    expect(progress.suggestedDailyNew).toBe(10) // ceil(310 / 31) = 10
    expect(progress.pace).toBe('behind') // current daily 5 < suggested 10
  })

  it('marks on_track when current daily new matches or is close to suggested quota', () => {
    const goal: CefrGoal = {
      level: 'A2',
      targetDate: '2026-11-19',
      createdAt: '2026-10-01',
    }
    const progress = calculateGoalProgress(goal, MOCK_COVERAGE, 10, NOW)
    expect(progress.suggestedDailyNew).toBe(10)
    expect(progress.pace).toBe('on_track')
  })

  it('marks ahead when current daily new comfortably exceeds suggested quota', () => {
    const goal: CefrGoal = {
      level: 'A2',
      targetDate: '2026-11-19',
      createdAt: '2026-10-01',
    }
    const progress = calculateGoalProgress(goal, MOCK_COVERAGE, 15, NOW)
    expect(progress.pace).toBe('ahead')
  })

  it('recognizes completed goals', () => {
    const fullCoverage: LevelCoverage[] = [
      { level: 'A1', total: 400, known: 380, learning: 20 },
      { level: 'A2', total: 600, known: 550, learning: 20 },
    ]
    const goal: CefrGoal = {
      level: 'A2',
      targetDate: '2026-11-19',
      createdAt: '2026-10-01',
    }
    const progress = calculateGoalProgress(goal, fullCoverage, 5, NOW)
    expect(progress.isCompleted).toBe(true)
    expect(progress.wordsRemaining).toBe(0)
    expect(progress.percent).toBe(100)
    expect(progress.suggestedDailyNew).toBe(0)
    expect(progress.pace).toBe('ahead')
  })

  it('caps the suggested quota at what the settings offer and says when the date is too close', () => {
    // 310 words in about 3 days needs over 100 a day.
    const progress = calculateGoalProgress({ level: 'A2', targetDate: '2026-10-22', createdAt: '2026-10-01' }, MOCK_COVERAGE, 5, NOW)
    expect(progress.neededDailyNew).toBeGreaterThan(MAX_DAILY_NEW)
    expect(progress.suggestedDailyNew).toBe(MAX_DAILY_NEW)
    expect(progress.unrealistic).toBe(true)
    expect(progress.pace).toBe('behind')
  })

  it('does not turn a passed date into a quota of every remaining word', () => {
    const progress = calculateGoalProgress({ level: 'A2', targetDate: '2026-10-01', createdAt: '2026-09-01' }, MOCK_COVERAGE, 5, NOW)
    expect(progress.isOverdue).toBe(true)
    expect(progress.suggestedDailyNew).toBeLessThanOrEqual(MAX_DAILY_NEW)
  })
})
