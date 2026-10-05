import { describe, expect, it } from 'vitest'
import { freeRecall } from '../freeRecall'
import type { VocabularyEntry } from '../types'

const w = (lemma: string, article?: string) => ({ id: lemma, language: 'fr', lemma, article, alternativeForms: [] }) as unknown as VocabularyEntry

describe('free recall', () => {
  it('finds the words written, in any order, without articles or accents', () => {
    const words = [w('année', "l'"), w('maison', 'la'), w('se lever'), w('attendre')]
    const { recalled, missed } = freeRecall(words, "l'annee, Maison\nse lever")
    expect(recalled.map((e) => e.lemma)).toEqual(['année', 'maison', 'se lever'])
    expect(missed.map((e) => e.lemma)).toEqual(['attendre'])
  })

  it('does not count a word inside another one', () => {
    expect(freeRecall([w('an')], 'année').recalled).toHaveLength(0)
  })
})
