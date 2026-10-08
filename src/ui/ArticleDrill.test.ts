import { describe, expect, it } from 'vitest'
import { createEntry } from '../data/wordInput'
import { nounGender } from '../data/wordInfo'
import { articleQuestion } from './articleQuestion'

const NOW = new Date('2026-10-03T10:00:00Z')

describe('articles', () => {
  it('splits the article off as typed, typographic apostrophes and plurals included', () => {
    const arbre = createEntry({ word: 'L’arbre', meaning: 'ağaç' }, 'fr', NOW)
    expect(arbre.lemma).toBe('arbre')
    expect(arbre.article).toBe("l'")
    expect(arbre.gender).toBeUndefined()
    const casas = createEntry({ word: 'las casas', meaning: 'evler' }, 'es', NOW)
    expect(casas.gender).toBe('f')
    expect(createEntry({ word: 'la maison', meaning: 'ev' }, 'fr', NOW)).toMatchObject({ lemma: 'maison', article: 'la', gender: 'f', partOfSpeech: 'noun' })
  })

  it('asks le/la, or un/une where French hides the gender, and el/la in Spanish', () => {
    expect(articleQuestion(createEntry({ word: 'la maison', meaning: 'ev' }, 'fr', NOW))).toEqual({ options: ['le', 'la'], answer: 'la' })
    expect(articleQuestion({ ...createEntry({ word: "l'arbre", meaning: 'ağaç' }, 'fr', NOW), gender: 'm' })).toEqual({ options: ['un', 'une'], answer: 'un' })
    expect(articleQuestion(createEntry({ word: "l'arbre", meaning: 'ağaç' }, 'fr', NOW))).toBeNull()
    expect(articleQuestion(createEntry({ word: 'el agua', meaning: 'su', gender: 'f' }, 'es', NOW))?.answer).toBe('el')
  })

  it('reads a noun gender from the dictionary headword', () => {
    expect(nounGender('===Noun===\n{{fr-noun|m}}\n# tree', 'fr')).toBe('m')
    expect(nounGender('{{es-noun|f|aguas}}', 'es')).toBe('f')
    expect(nounGender('{{fr-noun|m}}', 'en')).toBeUndefined()
  })
})
