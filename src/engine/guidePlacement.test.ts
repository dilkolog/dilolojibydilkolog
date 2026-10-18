import { describe, expect, it } from 'vitest'
import type { GuideLevel } from '../data/guide/lessonTypes'
import { endsHere, levelScores, missedLessons, placeLevel, type PlacementAnswer } from './guidePlacement'

const PER_LEVEL: Record<GuideLevel, number> = { A1: 6, A2: 6, B1: 7, B2: 6, C1: 5 }
const ans = (level: GuideLevel, rights: boolean[], lesson = 'x'): PlacementAnswer[] => rights.map((right) => ({ level, lesson, right }))
const run = (level: GuideLevel, right: number, total: number): PlacementAnswer[] => ans(level, Array.from({ length: total }, (_, i) => i < right))

describe('guide placement', () => {
  it('scores each level', () => {
    expect(levelScores([...run('A1', 5, 6), ...run('A2', 2, 6)]).A2).toEqual({ right: 2, total: 6 })
    expect(levelScores([]).C1).toEqual({ right: 0, total: 0 })
  })

  it('starts at the first level not passed, passing at 60% right', () => {
    const answers = [...run('A1', 4, 6), ...run('A2', 6, 6), ...run('B1', 3, 7)]
    expect(placeLevel(answers)).toEqual({ start: 'B1', passed: ['A1', 'A2'], all: false })
    // 4 of 6 is 67%: passed; 3 of 6 is 50%: not.
    expect(placeLevel([...run('A1', 3, 6)]).start).toBe('A1')
  })

  it('a level skipped by an easier failure is not counted even when its answers are right', () => {
    const answers = [...run('A1', 2, 6), ...run('A2', 6, 6)]
    expect(placeLevel(answers)).toEqual({ start: 'A1', passed: [], all: false })
  })

  it('all levels passed puts the learner at the top', () => {
    const answers = [...run('A1', 6, 6), ...run('A2', 6, 6), ...run('B1', 7, 7), ...run('B2', 6, 6), ...run('C1', 5, 5)]
    expect(placeLevel(answers)).toEqual({ start: 'C1', passed: ['A1', 'A2', 'B1', 'B2', 'C1'], all: true })
  })

  it('no answers means starting from the beginning', () => {
    expect(placeLevel([]).start).toBe('A1')
  })

  it('ends after the last question of a level that was not passed, not before', () => {
    expect(endsHere([], PER_LEVEL)).toBe(false)
    expect(endsHere(run('A1', 1, 5), PER_LEVEL)).toBe(false)
    expect(endsHere(run('A1', 1, 6), PER_LEVEL)).toBe(true)
    expect(endsHere(run('A1', 5, 6), PER_LEVEL)).toBe(false)
  })

  it('lists the lessons answered wrong once each, in order', () => {
    const answers = [...ans('A1', [false], 'a'), ...ans('A1', [true], 'b'), ...ans('A2', [false, false], 'c'), ...ans('A2', [false], 'a')]
    expect(missedLessons(answers)).toEqual(['a', 'c'])
  })
})
