import { describe, expect, it } from 'vitest'
import type { VocabularyEntry } from '../engine/types'
import { articleQuestion } from './articleQuestion'

describe('articleQuestion', () => {
  const baseEntry: VocabularyEntry = {
    id: 'fr:sample',
    language: 'fr',
    lemma: 'maison',
    partOfSpeech: 'noun',
    gender: 'f',
    article: 'la',
    cefr: 'A1',
    frequencyRank: 100,
    register: 'neutral',
    collocations: [],
    relations: [],
    wordFamily: [],
    tags: [],
    source: 'sample',
    senses: [{ id: '1', gloss: 'ev', examples: [] }],
  }

  it('asks le/la for French consonant-initial nouns', () => {
    const maisonF: VocabularyEntry = { ...baseEntry, lemma: 'maison', gender: 'f' }
    const q1 = articleQuestion(maisonF)
    expect(q1).toEqual({ options: ['le', 'la'], answer: 'la' })

    const livreM: VocabularyEntry = { ...baseEntry, lemma: 'livre', gender: 'm' }
    const q2 = articleQuestion(livreM)
    expect(q2).toEqual({ options: ['le', 'la'], answer: 'le' })
  })

  it('asks un/une for French vowel- or mute-h-initial nouns because le/la contracts to l\'', () => {
    const eauF: VocabularyEntry = { ...baseEntry, lemma: 'eau', gender: 'f' }
    const q1 = articleQuestion(eauF)
    expect(q1).toEqual({ options: ['un', 'une'], answer: 'une' })

    const hommeM: VocabularyEntry = { ...baseEntry, lemma: 'homme', gender: 'm' }
    const q2 = articleQuestion(hommeM)
    expect(q2).toEqual({ options: ['un', 'une'], answer: 'un' })

    const arbreM: VocabularyEntry = { ...baseEntry, lemma: 'arbre', gender: 'm' }
    const q3 = articleQuestion(arbreM)
    expect(q3).toEqual({ options: ['un', 'une'], answer: 'un' })
  })

  it('returns null for French words without gender', () => {
    const verb: VocabularyEntry = { ...baseEntry, lemma: 'manger', partOfSpeech: 'verb', gender: undefined }
    expect(articleQuestion(verb)).toBeNull()
  })

  it('asks el/la for Spanish nouns', () => {
    const casaF: VocabularyEntry = { ...baseEntry, language: 'es', lemma: 'casa', gender: 'f', article: 'la' }
    const q1 = articleQuestion(casaF)
    expect(q1).toEqual({ options: ['el', 'la'], answer: 'la' })

    const libroM: VocabularyEntry = { ...baseEntry, language: 'es', lemma: 'libro', gender: 'm', article: 'el' }
    const q2 = articleQuestion(libroM)
    expect(q2).toEqual({ options: ['el', 'la'], answer: 'el' })
  })

  it('returns null for English words', () => {
    const book: VocabularyEntry = { ...baseEntry, language: 'en', lemma: 'book', gender: undefined }
    expect(articleQuestion(book)).toBeNull()
  })
})
