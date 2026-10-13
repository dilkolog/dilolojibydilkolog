import { describe, expect, it } from 'vitest'
import { LAB_TENSES } from '../engine/tenses'
import { TENSE_LESSON } from './tenseLesson'

describe('the tense lessons', () => {
  const all = [...LAB_TENSES.fr, ...LAB_TENSES.es]

  it('has a lesson for every tense of the verb lab, and none for a tense the lab does not show', () => {
    for (const t of all) expect(TENSE_LESSON[t], t).toBeDefined()
    expect(Object.keys(TENSE_LESSON).sort()).toEqual([...all].sort())
  })

  it('every lesson says what the tense is, when it is used, how it is made, with examples and a way to remember', () => {
    for (const t of all) {
      const guide = TENSE_LESSON[t]!
      expect(guide.summary.length, `${t} summary`).toBeGreaterThan(20)
      expect(guide.uses.length, `${t} uses`).toBeGreaterThanOrEqual(2)
      expect(guide.formation.length, `${t} formation`).toBeGreaterThanOrEqual(1)
      expect(guide.examples.length, `${t} examples`).toBeGreaterThanOrEqual(2)
      expect(guide.watch.length, `${t} watch`).toBeGreaterThanOrEqual(1)
      expect(guide.tip.length, `${t} tip`).toBeGreaterThan(10)
      for (const e of guide.examples) {
        expect(e.text.trim(), `${t} example`).not.toBe('')
        expect(e.tr.trim(), `${t} translation`).not.toBe('')
      }
    }
  })

  it('has no stray markup or placeholder text', () => {
    const text = JSON.stringify(TENSE_LESSON)
    expect(text).not.toMatch(/TODO|FIXME|\blorem\b|<[a-z]+>/)
  })
})
