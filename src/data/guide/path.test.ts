import { describe, expect, it } from 'vitest'
import { lessonsOf } from './lessonOf'
import { learningPath, pathOrder } from './path'
import { PREREQS } from './prereqs'

const lesson = (topic: string, level: 'A1' | 'A2' | 'B1' = 'A1') => ({ topic, level })

describe('the path of lessons', () => {
  it('puts the easier levels first and a lesson after what it builds on, keeping the list order otherwise', () => {
    // The subjunctive past builds on the subjunctive, which builds on the present (listed against that order; the last two share a level).
    const order = pathOrder([lesson('subjonctif', 'A2'), lesson('basics_fr_subjonctif_passe', 'A2'), lesson('basics_fr_present', 'A1'), lesson('basics_fr_etre_avoir', 'A1'), lesson('basics_fr_articles', 'A1')]).map((l) => l.topic)
    expect(order.indexOf('basics_fr_present')).toBeLessThan(order.indexOf('subjonctif'))
    expect(order.indexOf('subjonctif')).toBeLessThan(order.indexOf('basics_fr_subjonctif_passe'))
    // Inside one level, the lesson that is built on comes first.
    const same = pathOrder([lesson('basics_fr_imperatif'), lesson('basics_fr_present')]).map((l) => l.topic)
    expect(same).toEqual(['basics_fr_present', 'basics_fr_imperatif'])
  })

  it('never lists a real lesson before a lesson it needs, in any language', () => {
    for (const language of ['fr', 'es', 'en'] as const) {
      const order = pathOrder(lessonsOf(language)).map((l) => l.topic)
      expect(new Set(order).size).toBe(order.length)
      expect(order.length).toBe(lessonsOf(language).length)
      for (const topic of order) for (const need of PREREQS[topic] ?? []) if (order.includes(need)) expect(order.indexOf(need), `${need} before ${topic}`).toBeLessThan(order.indexOf(topic))
    }
  })

  it('marks what is done, the one to read now, what is open and what waits', () => {
    const lessons = [lesson('basics_fr_present'), lesson('basics_fr_etre_avoir'), lesson('basics_fr_imperatif', 'A2'), lesson('subjonctif', 'B1')]
    const read = new Set(['basics_fr_etre_avoir'])
    const learned = new Set(['basics_fr_etre_avoir'])
    const steps = learningPath(lessons, (t) => read.has(t), (t) => learned.has(t))
    const by = Object.fromEntries(steps.map((s) => [s.lesson.topic, s]))
    expect(by.basics_fr_etre_avoir!.state).toBe('learned')
    expect(by.basics_fr_present!.state).toBe('next')
    expect(by.basics_fr_imperatif!.state).toBe('waiting')
    expect(by.basics_fr_imperatif!.needs).toEqual(['basics_fr_present'])
    expect(by.subjonctif!.state).toBe('waiting')
    expect(steps.map((s) => s.number)).toEqual([1, 2, 3, 4])
    // Once the present is read, it is "read" (not yet passed) and the imperative is next.
    read.add('basics_fr_present')
    const later = Object.fromEntries(learningPath(lessons, (t) => read.has(t), (t) => learned.has(t)).map((s) => [s.lesson.topic, s.state]))
    expect(later).toMatchObject({ basics_fr_present: 'read', basics_fr_imperatif: 'next', subjonctif: 'open' })
  })

  it('has a next step while anything is unread, and none when everything is read', () => {
    const lessons = [lesson('subjonctif', 'B1')]
    expect(learningPath(lessons, () => false, () => false)[0]!.state).toBe('next')
    expect(learningPath(lessons, () => true, () => false)[0]!.state).toBe('read')
  })
})
