import type { GuideLevel } from '../data/guide/lessonTypes'

/** The levels in order. */
export const PLACEMENT_LEVELS: GuideLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']
/** A level is passed with this share of its questions right. */
export const LEVEL_PASS = 0.6

export interface PlacementAnswer {
  level: GuideLevel
  lesson: string
  right: boolean
}

export interface LevelScore {
  right: number
  total: number
}

/** Right and asked, per level. */
export function levelScores(answers: readonly PlacementAnswer[]): Record<GuideLevel, LevelScore> {
  const out = Object.fromEntries(PLACEMENT_LEVELS.map((l) => [l, { right: 0, total: 0 }])) as Record<GuideLevel, LevelScore>
  for (const a of answers) {
    out[a.level].total += 1
    if (a.right) out[a.level].right += 1
  }
  return out
}

const passed = (s: LevelScore) => s.total > 0 && s.right / s.total >= LEVEL_PASS

/**
 * Whether the test ends after this answer: the last question of a level that was not passed (what is harder will not
 * be passed either, so it is not asked). `perLevel` is how many questions each level has.
 */
export function endsHere(answers: readonly PlacementAnswer[], perLevel: Record<GuideLevel, number>): boolean {
  const last = answers[answers.length - 1]
  if (!last) return false
  const score = levelScores(answers)[last.level]
  return score.total >= perLevel[last.level] && !passed(score)
}

export interface Placement {
  /** The level to start from: the first one not passed (C1 when all are). */
  start: GuideLevel
  /** The levels passed in a row from A1. */
  passed: GuideLevel[]
  /** Every level was passed. */
  all: boolean
}

/** Where the learner stands: the levels passed in a row from the easiest, the next one is where to start. */
export function placeLevel(answers: readonly PlacementAnswer[]): Placement {
  const scores = levelScores(answers)
  const done: GuideLevel[] = []
  for (const level of PLACEMENT_LEVELS) {
    if (!passed(scores[level])) return { start: level, passed: done, all: false }
    done.push(level)
  }
  return { start: 'C1', passed: done, all: true }
}

/** The lessons answered wrong, once each, in the order asked: what to look at first. */
export function missedLessons(answers: readonly PlacementAnswer[]): string[] {
  return [...new Set(answers.filter((a) => !a.right).map((a) => a.lesson))]
}

/** The day lessons marked as known from the placement carry: long ago, so that they count for no week and no streak. */
export const KNOWN_DAY = '2000-01-01'
