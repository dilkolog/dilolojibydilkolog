import { describe, expect, it } from 'vitest'
import { CONFUSABLE_RULES, confusableRuleFor, buildConfusableQuestions } from './confusableRules'

describe('confusableRules', () => {
  it('covers core confusable pairs across languages', () => {
    expect(CONFUSABLE_RULES.length).toBeGreaterThanOrEqual(15)
    for (const r of CONFUSABLE_RULES) {
      expect(r.words).toHaveLength(2)
      expect(r.meanings).toHaveLength(2)
      expect(r.distinction).toBeTruthy()
    }
  })

  it('finds rule by single word or pair', () => {
    const frRule = confusableRuleFor('jour', 'fr', 'journée')
    expect(frRule).toBeDefined()
    expect(frRule?.id).toBe('fr:jour-journee')

    const esRule = confusableRuleFor('ser', 'es')
    expect(esRule).toBeDefined()
    expect(esRule?.words).toContain('estar')

    const enRule = confusableRuleFor('affect', 'en', 'effect')
    expect(enRule).toBeDefined()
    expect(enRule?.distinction).toContain('fiildir')
  })

  it('builds questions for all supported languages', () => {
    const frQs = buildConfusableQuestions('fr')
    const esQs = buildConfusableQuestions('es')
    const enQs = buildConfusableQuestions('en')

    expect(frQs.length).toBeGreaterThan(0)
    expect(esQs.length).toBeGreaterThan(0)
    expect(enQs.length).toBeGreaterThan(0)

    for (const q of [...frQs, ...esQs, ...enQs]) {
      expect(q.prompt).toBeTruthy()
      expect(q.correct).toBeTruthy()
      expect(q.wrong).toBeTruthy()
      expect(q.distinction).toBeTruthy()
    }
  })
})

