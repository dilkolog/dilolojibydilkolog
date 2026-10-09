import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import { analyzeText } from '../reading'
import { addTenses } from '../tenses'
import { groupByTense, textForms } from '../textForms'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

const analyze = (text: string, lang: 'fr' | 'es') => analyzeText(text, lang, [], [], new Set())

describe('verb forms in a text', () => {
  it('finds the forms in reading order, with their verb and tense', () => {
    const found = textForms('fr', analyze('Je parle. Nous parlions hier.', 'fr'))
    expect(found).toContainEqual({ form: 'parle', lemma: 'parler', tense: 'present' })
    expect(found).toContainEqual({ form: 'parlions', lemma: 'parler', tense: 'imparfait' })
    expect(found.findIndex((f) => f.form === 'parle')).toBeLessThan(found.findIndex((f) => f.form === 'parlions'))
  })

  it('reads a leading imperative before an exclamation mark as an imperative', () => {
    const found = textForms('fr', analyze('Viens ici !', 'fr'))
    expect(found.some((f) => f.lemma === 'venir' && f.form === 'viens')).toBe(true)
  })

  it('works in Spanish and finds nothing in a text without verbs', () => {
    expect(textForms('es', analyze('Ella habla mucho.', 'es'))).toContainEqual({ form: 'habla', lemma: 'hablar', tense: 'presente' })
    expect(textForms('fr', analyze('Le chat noir.', 'fr'))).toEqual([])
  })
})

describe('forms grouped by tense', () => {
  it('puts the busiest tense first and counts a repeated form once with its count', () => {
    const groups = groupByTense([
      { form: 'parle', lemma: 'parler', tense: 'present' },
      { form: 'parlait', lemma: 'parler', tense: 'imparfait' },
      { form: 'parlait', lemma: 'parler', tense: 'imparfait' },
      { form: 'allait', lemma: 'aller', tense: 'imparfait' },
      { form: 'allait', lemma: 'aller', tense: 'imparfait' },
      { form: 'allait', lemma: 'aller', tense: 'imparfait' },
    ])
    expect(groups.map((g) => [g.tense, g.total])).toEqual([['imparfait', 5], ['present', 1]])
    expect(groups[0].forms).toEqual([
      { form: 'allait', lemma: 'aller', count: 3 },
      { form: 'parlait', lemma: 'parler', count: 2 },
    ])
  })

  it('is empty for no forms', () => {
    expect(groupByTense([])).toEqual([])
  })
})
