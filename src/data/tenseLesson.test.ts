import { describe, expect, it } from 'vitest'
import { LAB_TENSES } from '../engine/tenses'
import { TENSE_LESSON } from './tenseLesson'

describe('TENSE_LESSON', () => {
  it('covers every French and Spanish verb-lab tense with complete pedagogical fields', () => {
    const allLabTenses = [...LAB_TENSES.fr, ...LAB_TENSES.es]
    for (const tense of allLabTenses) {
      const lesson = TENSE_LESSON[tense]
      expect(lesson, tense).toBeDefined()
      expect(lesson!.summary.trim().length, `${tense}.summary`).toBeGreaterThan(10)
      expect(lesson!.uses.length, `${tense}.uses`).toBeGreaterThanOrEqual(2)
      expect(lesson!.formation.length, `${tense}.formation`).toBeGreaterThanOrEqual(1)
      expect(lesson!.examples.length, `${tense}.examples`).toBeGreaterThanOrEqual(2)
      for (const ex of lesson!.examples) {
        expect(ex.text.trim() && ex.tr.trim(), `${tense} example`).toBeTruthy()
      }
      expect(lesson!.watch.length, `${tense}.watch`).toBeGreaterThanOrEqual(1)
      expect(lesson!.tip.trim().length, `${tense}.tip`).toBeGreaterThan(5)
      expect(lesson!.turkish?.trim().length, `${tense}.turkish`).toBeGreaterThan(3)
    }
  })
})
