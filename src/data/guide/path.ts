import type { GuideLevel } from './lessonTypes'
import { PREREQS } from './prereqs'

const LEVELS: GuideLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']

/** Where a lesson stands on the path: done, the one to read now, open (its groundwork is read), or waiting on a lesson not read yet. */
export type PathState = 'learned' | 'read' | 'next' | 'open' | 'waiting'

export interface PathStep<T> {
  lesson: T
  /** 1-based place on the whole path. */
  number: number
  state: PathState
  /** The lessons it builds on that are not read (their topics). */
  needs: string[]
}

/**
 * The lessons in the order to learn them: the easier levels first and, inside a level, a lesson after the lessons of
 * the same level it builds on (the lists keep their own order otherwise). A lesson never comes before one it needs.
 */
export function pathOrder<T extends { topic: string; level: GuideLevel }>(lessons: readonly T[]): T[] {
  const out: T[] = []
  for (const level of LEVELS) {
    const group = lessons.filter((l) => l.level === level)
    const inGroup = new Map(group.map((l) => [l.topic, l]))
    const done = new Set<string>()
    const visit = (l: T) => {
      if (done.has(l.topic)) return
      done.add(l.topic)
      for (const need of PREREQS[l.topic] ?? []) {
        const before = inGroup.get(need)
        if (before) visit(before)
      }
      out.push(l)
    }
    group.forEach(visit)
  }
  return out
}

/**
 * The path with each lesson's state: `learned` (read and passed), `read`, `next` (the first not read whose groundwork is
 * read, else the first not read), `open`, or `waiting`.
 */
export function learningPath<T extends { topic: string; level: GuideLevel }>(lessons: readonly T[], isRead: (topic: string) => boolean, isLearned: (topic: string) => boolean): PathStep<T>[] {
  const ordered = pathOrder(lessons)
  const unmet = (topic: string) => (PREREQS[topic] ?? []).filter((t) => !isRead(t))
  const left = ordered.filter((l) => !isRead(l.topic))
  const next = left.find((l) => unmet(l.topic).length === 0) ?? left[0]
  return ordered.map((lesson, i) => {
    const needs = isRead(lesson.topic) ? [] : unmet(lesson.topic)
    const state: PathState = isRead(lesson.topic) ? (isLearned(lesson.topic) ? 'learned' : 'read') : lesson === next ? 'next' : needs.length ? 'waiting' : 'open'
    return { lesson, number: i + 1, state, needs }
  })
}
