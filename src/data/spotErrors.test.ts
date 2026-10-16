import { describe, expect, it } from 'vitest'
import { SPOT_ERRORS, spotErrorRound } from './spotErrors'
import { createRng } from '../engine/rng'

describe('spotErrors data integrity', () => {
  it('every item has an errorIndex that matches the faulty token', () => {
    for (const item of SPOT_ERRORS) {
      const tokens = item.sentence.split(' ')
      expect(
        tokens[item.errorIndex],
        `Item ${item.id} errorIndex ${item.errorIndex} should match faulty "${item.faulty}" in "${item.sentence}"`,
      ).toBe(item.faulty)
    }
  })

  it('every item has distinct distractors and correct answer', () => {
    for (const item of SPOT_ERRORS) {
      expect(item.distractors.length).toBe(2)
      expect(item.distractors).not.toContain(item.correct)
      expect(item.distractors).not.toContain(item.faulty)
      expect(item.explanation.length).toBeGreaterThan(20)
    }
  })

  it('covers French, Spanish, and English with at least 12 items each', () => {
    const fr = SPOT_ERRORS.filter((i) => i.language === 'fr')
    const es = SPOT_ERRORS.filter((i) => i.language === 'es')
    const en = SPOT_ERRORS.filter((i) => i.language === 'en')

    expect(fr.length).toBeGreaterThanOrEqual(12)
    expect(es.length).toBeGreaterThanOrEqual(12)
    expect(en.length).toBeGreaterThanOrEqual(12)
  })

  it('spotErrorRound draws the requested count and prioritizes missed items', () => {
    const rng = createRng(42)
    const round = spotErrorRound('fr', 5, rng)
    expect(round.length).toBe(5)

    // With a log that misses fr-spot-01 heavily
    const biasedRound = spotErrorRound('fr', 3, rng, {
      'fr-spot-01': { ok: 0, wrong: 10, last: '2026-10-16T12:00:00Z' },
    })
    expect(biasedRound.map((b) => b.id)).toContain('fr-spot-01')
  })
})
