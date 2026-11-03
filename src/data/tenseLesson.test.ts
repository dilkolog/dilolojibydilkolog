import { describe, expect, it } from 'vitest'
import { LAB_TENSES } from '../engine/tenses'
import { TENSE_LESSON } from './tenseLesson'
import { TENSE_LESSON_MORE } from './tenseLessonMore'

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

  it('has the second layer for every tense: a formula, signal words, contrasts, slips and more examples', () => {
    for (const tense of [...LAB_TENSES.fr, ...LAB_TENSES.es]) {
      const more = TENSE_LESSON_MORE[tense]
      expect(more, tense).toBeDefined()
      expect(more!.formula.trim().length, `${tense}.formula`).toBeGreaterThan(10)
      expect(more!.markers.length, `${tense}.markers`).toBeGreaterThanOrEqual(5)
      expect(more!.contrast.length, `${tense}.contrast`).toBeGreaterThanOrEqual(2)
      expect(more!.slips.length, `${tense}.slips`).toBeGreaterThanOrEqual(2)
      for (const slip of more!.slips) {
        expect(slip.wrong.trim() && slip.right.trim() && slip.why.trim(), `${tense} slip`).toBeTruthy()
        expect(slip.wrong, `${tense} slip is a slip`).not.toBe(slip.right)
      }
      expect(more!.examples.length, `${tense}.examples`).toBeGreaterThanOrEqual(3)
    }
  })
})
