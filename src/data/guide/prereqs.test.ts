import { describe, expect, it } from 'vitest'
import { lessonsOf } from './lessonOf'
import { PREREQS, pickNext, unmetPrereqs } from './prereqs'

const RANK = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 } as const
const all = (['fr', 'es', 'en'] as const).flatMap((l) => lessonsOf(l))
const byTopic = new Map(all.map((l) => [l.topic, l]))

describe('lesson prerequisites', () => {
  it('name lessons of the same language, of a level not above the lesson, and never themselves', () => {
    for (const [topic, needs] of Object.entries(PREREQS)) {
      const lesson = byTopic.get(topic)
      expect(lesson, `${topic} is a lesson`).toBeDefined()
      for (const n of needs) {
        const need = byTopic.get(n)
        expect(need, `${topic} needs ${n}`).toBeDefined()
        expect(need!.language, `${topic} / ${n}`).toBe(lesson!.language)
        expect(RANK[need!.level], `${topic} / ${n} level`).toBeLessThanOrEqual(RANK[lesson!.level])
        expect(n).not.toBe(topic)
      }
    }
  })

  it('have no cycle', () => {
    const state = new Map<string, 'open' | 'done'>()
    const visit = (t: string, path: string[]) => {
      if (state.get(t) === 'done') return
      expect(state.get(t), `cycle through ${[...path, t].join(' → ')}`).toBeUndefined()
      state.set(t, 'open')
      for (const n of PREREQS[t] ?? []) visit(n, [...path, t])
      state.set(t, 'done')
    }
    for (const t of Object.keys(PREREQS)) visit(t, [])
  })

  it('list what is unread, and the next lesson is the first one whose groundwork is read', () => {
    const read = new Set(['basics_fr_etre_avoir'])
    const isRead = (t: string) => read.has(t)
    expect(unmetPrereqs('basics_fr_present', isRead)).toEqual([])
    expect(unmetPrereqs('subjonctif', isRead)).toEqual(['basics_fr_present'])
    const ordered = [{ topic: 'subjonctif' }, { topic: 'basics_fr_present' }, { topic: 'basics_fr_etre_avoir' }]
    // The subjunctive comes first in the list but builds on the present: the present is next.
    expect(pickNext(ordered, isRead)?.topic).toBe('basics_fr_present')
    read.add('basics_fr_present')
    expect(pickNext(ordered, isRead)?.topic).toBe('subjonctif')
    // Everything left builds on something unread: the first one left, not nothing.
    expect(pickNext([{ topic: 'subjonctif' }], () => false)?.topic).toBe('subjonctif')
    expect(pickNext(ordered, () => true)).toBeUndefined()
  })
})
