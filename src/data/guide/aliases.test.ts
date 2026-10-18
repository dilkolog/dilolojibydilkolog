import { describe, expect, it } from 'vitest'
import { canonicalTopic, LESSON_ALIASES } from './aliases'
import { lessonFor, lessonsOf } from './lessonOf'
import { PREREQS } from './prereqs'

describe('lesson aliases', () => {
  it('every old topic leads to a lesson that exists and is no lesson of its own any more', () => {
    for (const [old, kept] of Object.entries(LESSON_ALIASES)) {
      expect(lessonsOf('en').some((l) => l.topic === old), `${old} is still a lesson`).toBe(false)
      expect(lessonFor('en', kept)?.topic).toBe(kept)
      // An old link, or the grammar topic of the same name, still opens the kept lesson.
      expect(lessonFor('en', old)?.topic).toBe(kept)
      expect(PREREQS[old]).toBeUndefined()
    }
  })

  it('does not chain: the kept topic is not itself an old one', () => {
    for (const kept of Object.values(LESSON_ALIASES)) expect(canonicalTopic(kept)).toBe(kept)
  })

  it('leaves other topics alone', () => {
    expect(canonicalTopic('subjonctif')).toBe('subjonctif')
  })
})
