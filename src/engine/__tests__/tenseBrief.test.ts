import { describe, expect, it } from 'vitest'
import { TENSE_BRIEF } from '../tenseBrief'
import type { Tense } from '../tenses'

describe('tenseBrief dictionary', () => {
  const allTenses: Tense[] = [
    'present',
    'passe-compose',
    'imparfait',
    'futur',
    'conditionnel',
    'subjonctif',
    'presente',
    'preterito',
    'perfecto',
    'imperfecto',
    'futuro',
    'condicional',
    'subjuntivo',
    'passe-simple',
    'imperatif',
    'plus-que-parfait',
    'futur-anterieur',
    'conditionnel-passe',
    'subjonctif-passe',
    'infinitif-passe',
    'participe-compose',
    'infinitivo-compuesto',
    'gerundio-compuesto',
    'imperativo',
    'pluscuamperfecto',
    'futuro-perfecto',
    'condicional-perfecto',
    'subjuntivo-imperfecto',
    'subjuntivo-perfecto',
    'subjuntivo-pluscuamperfecto',
  ]

  it('provides a valid brief for every known tense', () => {
    for (const t of allTenses) {
      const brief = TENSE_BRIEF[t]
      expect(brief, `Missing brief for tense: ${t}`).toBeDefined()
      expect(brief.name.trim().length).toBeGreaterThan(0)
      expect(brief.tr.trim().length).toBeGreaterThan(0)
      expect(brief.short.trim().length).toBeGreaterThan(10)
    }
  })

  it('properly distinguishes key French and Spanish tenses', () => {
    expect(TENSE_BRIEF['passe-compose'].name).toBe('passé composé')
    expect(TENSE_BRIEF['preterito'].name).toBe('pretérito indefinido')
    expect(TENSE_BRIEF['imparfait'].name).toBe('imparfait')
    expect(TENSE_BRIEF['imperfecto'].name).toBe('pretérito imperfecto')
  })
})
