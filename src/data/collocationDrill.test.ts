import { describe, expect, it } from 'vitest'
import { COLLOCATION_DRILLS, collocationDrillRound } from './collocationDrill'
import type { TargetLanguage } from '../engine/types'

describe('COLLOCATION_DRILLS dataset integrity', () => {
  it('has at least 15 curated items for each supported language (FR, ES, EN)', () => {
    const langs: TargetLanguage[] = ['fr', 'es', 'en']
    for (const lang of langs) {
      const items = COLLOCATION_DRILLS.filter((c) => c.language === lang)
      expect(items.length).toBeGreaterThanOrEqual(15)
    }
  })

  it('ensures every item has exactly 4 unique options including the target', () => {
    for (const item of COLLOCATION_DRILLS) {
      expect(item.options).toHaveLength(4)
      expect(new Set(item.options).size).toBe(4)
      expect(item.options).toContain(item.target)
    }
  })

  it('ensures clozeSentence has ___ and matches fullSentence when target is plugged in', () => {
    for (const item of COLLOCATION_DRILLS) {
      expect(item.clozeSentence).toContain('___')
      const reconstructed = item.clozeSentence.replace('___', item.target)
      expect(reconstructed.toLowerCase()).toBe(item.fullSentence.toLowerCase())
    }
  })

  it('ensures all items have pedagogical explanation and Turkish translation', () => {
    for (const item of COLLOCATION_DRILLS) {
      expect(item.explanation.trim().length).toBeGreaterThan(15)
      expect(item.tr.trim().length).toBeGreaterThan(5)
      expect(item.pattern.trim().length).toBeGreaterThan(3)
    }
  })
})

describe('collocationDrillRound', () => {
  it('returns requested count of questions for a language', () => {
    const round = collocationDrillRound('fr', {}, 10)
    expect(round).toHaveLength(10)
    expect(round.every((r) => r.language === 'fr')).toBe(true)
  })

  it('prioritizes recently missed items over mastered ones', () => {
    const log = {
      'fr-colloc-01': { ok: 0, wrong: 3, last: '2026-10-16T12:00:00Z' },
      'fr-colloc-02': { ok: 10, wrong: 0, last: '2026-10-16T12:00:00Z' },
    }
    // High-probability run
    const round = collocationDrillRound('fr', log, 18, () => 0.99)
    const missedIndex = round.findIndex((r) => r.id === 'fr-colloc-01')
    const masteredIndex = round.findIndex((r) => r.id === 'fr-colloc-02')
    expect(missedIndex).toBeLessThan(masteredIndex)
  })
})
