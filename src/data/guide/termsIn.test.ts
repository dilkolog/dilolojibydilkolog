import { describe, expect, it } from 'vitest'
import { lessonsOf } from './lessonOf'
import { lessonTexts, termsIn, termsOf, type GuideTerm } from './terms'

const terms: GuideTerm[] = [
  { term: 'présent', tr: 'şimdiki zaman', explanation: 'x' },
  { term: 'présent de l\'indicatif', tr: 'bildirme kipi şimdiki', explanation: 'x' },
  { term: 'article défini', aliases: ['articles définis'], tr: 'belirli artikel', explanation: 'x' },
  { term: 'accord', tr: 'uyum', explanation: 'x' },
]

describe('terms in a lesson', () => {
  it('finds a term or alias whole, whatever accents and capitals, in the order it first appears', () => {
    const found = termsIn(terms, ['Les ARTICLES DEFINIS değişir.', 'Önce accord sonra article défini.'])
    expect(found.map((t) => t.term)).toEqual(['article défini', 'accord'])
  })

  it('hides a term that only sits inside a longer one that was found', () => {
    expect(termsIn(terms, ["le présent de l'indicatif"]).map((t) => t.term)).toEqual(["présent de l'indicatif"])
    expect(termsIn(terms, ['le présent, et le présent de l’indicatif']).map((t) => t.term)).toEqual(['présent', "présent de l'indicatif"])
  })

  it('does not take part of a word for a term', () => {
    expect(termsIn(terms, ['accordéon et présentation'])).toEqual([])
  })

  it('offers a lesson of the guide some of its terms', () => {
    const lesson = lessonsOf('fr').find((l) => l.topic === 'basics_fr_articles')!
    const found = termsIn(termsOf('fr'), lessonTexts(lesson))
    expect(found.length).toBeGreaterThan(0)
    expect(found.length).toBeLessThanOrEqual(8)
  })
})
