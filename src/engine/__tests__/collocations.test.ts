import { describe, expect, it } from 'vitest'
import { collocationsOf, type Collocation } from '../collocations'

describe('collocationsOf', () => {
  const sampleList: Collocation[] = [
    {
      id: 'fr-decider-de',
      language: 'fr',
      lemmas: ['décider', 'décision'],
      pattern: 'décider de + inf.',
      example: 'Il a décidé de partir.',
      tr: 'Ayrılmaya karar verdi.',
      source: 'test',
    },
    {
      id: 'fr-prendre-decision',
      language: 'fr',
      lemmas: ['prendre', 'décision'],
      pattern: 'prendre une décision',
      example: 'Nous devons prendre une décision.',
      tr: 'Bir karar vermeliyiz.',
      source: 'test',
    },
    {
      id: 'fr-autre-decision',
      language: 'fr',
      lemmas: ['décision'],
      pattern: 'bonne décision',
      example: "C'est une bonne décision.",
      tr: 'Bu iyi bir karar.',
      source: 'test',
    },
    {
      id: 'es-tomar-decision',
      language: 'es',
      lemmas: ['tomar', 'decisión'],
      pattern: 'tomar una decisión',
      example: 'Hay que tomar una decisión.',
      tr: 'Bir karar almak gerek.',
      source: 'test',
    },
  ]

  it('matches lemma case-insensitively and strips whitespace', () => {
    const results = collocationsOf(sampleList, 'fr', '  DÉCIDER  ')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('fr-decider-de')
  })

  it('filters by language strictly', () => {
    const frResults = collocationsOf(sampleList, 'fr', 'décision', 10)
    expect(frResults.map((c) => c.id)).toEqual(['fr-decider-de', 'fr-prendre-decision', 'fr-autre-decision'])

    const esResults = collocationsOf(sampleList, 'es', 'decisión', 10)
    expect(esResults.map((c) => c.id)).toEqual(['es-tomar-decision'])

    const enResults = collocationsOf(sampleList, 'en', 'decision', 10)
    expect(enResults).toHaveLength(0)
  })

  it('limits returned items to max (default 2)', () => {
    const defaultMax = collocationsOf(sampleList, 'fr', 'décision')
    expect(defaultMax).toHaveLength(2)
    expect(defaultMax.map((c) => c.id)).toEqual(['fr-decider-de', 'fr-prendre-decision'])

    const max1 = collocationsOf(sampleList, 'fr', 'décision', 1)
    expect(max1).toHaveLength(1)
    expect(max1[0].id).toBe('fr-decider-de')
  })

  it('returns empty array when lemma is not found', () => {
    const results = collocationsOf(sampleList, 'fr', 'inexistant')
    expect(results).toEqual([])
  })
})
