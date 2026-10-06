import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import '../conjugationData'
import { addTenses } from '../tenses'
import { diagnose } from '../formDiagnosis'

const v = (language: 'fr' | 'es', lemma: string) => ({ language, lemma, partOfSpeech: 'verb' as const })

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

describe('what kind of slip it was', () => {
  it('another person of the same tense', () => {
    expect(diagnose(v('es', 'comer'), 'presente', 0, 'comes')).toBe('person')
    expect(diagnose(v('fr', 'parler'), 'present', 3, 'parlez')).toBe('person')
  })

  it('another tense of the verb', () => {
    expect(diagnose(v('es', 'comer'), 'preterito', 0, 'como')).toBe('tense')
    expect(diagnose(v('fr', 'parler'), 'passe-compose', 0, 'parle')).toBe('tense')
  })

  it('the right letters without the accent', () => {
    expect(diagnose(v('es', 'comer'), 'preterito', 0, 'comi')).toBe('accent')
    expect(diagnose(v('es', 'cantar'), 'futuro', 0, 'cantare')).toBe('accent')
  })

  it('an irregular form that was not known', () => {
    expect(diagnose(v('es', 'tener'), 'presente', 0, 'teno')).toBe('typo')
    expect(diagnose(v('es', 'tener'), 'presente', 0, 'tengues')).toBe('irregular')
    expect(diagnose(v('es', 'ir'), 'preterito', 0, 'ií')).toBe('irregular')
  })

  it('a slip in a regular form, and the rest', () => {
    expect(diagnose(v('es', 'comer'), 'presente', 0, 'comeo')).toBe('typo')
    expect(diagnose(v('es', 'comer'), 'presente', 0, 'xyz')).toBe('other')
  })
})
