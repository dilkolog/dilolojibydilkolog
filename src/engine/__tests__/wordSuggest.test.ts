import { describe, expect, it } from 'vitest'
import { addedToday, articleFor, fillMissing, missingFields, needsFill, suggestCount, suggestionDue } from '../wordSuggest'
import type { VocabularyEntry } from '../types'
import { createEntry } from '../../data/wordInput'

const NOW = new Date(2026, 9, 11, 15, 0)
const entry = (word: string, meaning: string, over: Partial<VocabularyEntry> = {}, language: 'fr' | 'es' | 'en' = 'fr', at = new Date(2026, 9, 1)): VocabularyEntry => ({ ...createEntry({ word, meaning }, language, at), ...over })

describe('suggestCount', () => {
  it('follows the daily setting, between 3 and 10', () => {
    expect(suggestCount(5)).toBe(5)
    expect(suggestCount(1)).toBe(3)
    expect(suggestCount(20)).toBe(10)
    expect(suggestCount(undefined)).toBe(5)
    expect(suggestCount(0)).toBe(5)
  })
})

describe('suggestionDue', () => {
  const own = (n: number, at: Date) => Array.from({ length: n }, (_, i) => entry(`mot${i}`, 'x', {}, 'fr', at))
  it('is due on a day without an added word, for a list of one’s own', () => {
    expect(suggestionDue(own(6, new Date(2026, 9, 1)), NOW)).toBe(true)
    expect(suggestionDue(own(6, new Date(2026, 9, 11, 9, 0)), NOW)).toBe(false)
    expect(addedToday(own(6, new Date(2026, 9, 11, 9, 0)), NOW)).toBe(6)
  })
  it('waits for a few words of one’s own, and ignores the sample words', () => {
    expect(suggestionDue(own(3, new Date(2026, 9, 1)), NOW)).toBe(false)
    const sample = Array.from({ length: 20 }, (_, i) => entry(`ex${i}`, 'x', { source: 'sample' }))
    expect(suggestionDue(sample, NOW)).toBe(false)
  })
})

describe('missingFields', () => {
  it('names what is lacking: an example, a noun’s gender, a part of speech', () => {
    const bare = entry('maison', 'ev', { partOfSpeech: 'noun' })
    expect(missingFields(bare)).toEqual(['example', 'gender'])
    expect(missingFields(entry('beau', 'güzel', { partOfSpeech: 'other' }))).toEqual(['example', 'partOfSpeech'])
    expect(missingFields(entry('house', 'ev', { partOfSpeech: 'noun' }, 'en'))).toEqual(['example'])
    expect(missingFields(entry('avoir le cafard', 'canı sıkılmak', { partOfSpeech: 'phrase' }))).toEqual([])
    expect(missingFields(entry('chat', 'kedi', { source: 'sample' }))).toEqual([])
    const full = entry('chat', 'kedi', { partOfSpeech: 'noun', gender: 'm' })
    full.senses[0].examples.push({ text: 'Le chat dort.', translation: 'Kedi uyuyor.', form: 'chat' })
    expect(missingFields(full)).toEqual([])
    expect(needsFill([bare, full]).map((e) => e.lemma)).toEqual(['maison'])
  })
})

describe('articleFor', () => {
  it('gives the article of the gender, l’ before a vowel in French', () => {
    expect(articleFor('fr', 'maison', 'f')).toBe('la')
    expect(articleFor('fr', 'livre', 'm')).toBe('le')
    expect(articleFor('fr', 'arbre', 'm')).toBe("l'")
    expect(articleFor('es', 'casa', 'f')).toBe('la')
    expect(articleFor('es', 'libro', 'm')).toBe('el')
    expect(articleFor('en', 'house', 'm')).toBeUndefined()
  })
})

describe('fillMissing', () => {
  const donor = (over: Partial<VocabularyEntry> = {}) => ({ ...createEntry({ word: 'la maison', meaning: 'ev, konut', example: 'J’habite dans une *maison* rouge.', exampleTranslation: 'Kırmızı bir evde oturuyorum.', collocations: 'maison de campagne = kır evi', literal: '' }, 'fr', NOW), ...over })

  it('fills only the blanks: gender and article, an example, collocations; the learner’s words stay', () => {
    const mine = entry('maison', 'bizim ev', { partOfSpeech: 'noun', notes: 'benim notum' })
    const next = fillMissing(mine, donor())!
    expect(next.gender).toBe('f')
    expect(next.article).toBe('la')
    expect(next.senses[0].gloss).toBe('bizim ev')
    expect(next.senses[0].examples[0]).toMatchObject({ text: 'J’habite dans une maison rouge.', form: 'maison' })
    expect(next.notes).toBe('benim notum')
    expect(next.collocations.length).toBeGreaterThan(0)
  })

  it('leaves what is there alone and says nothing when nothing is added', () => {
    const full = entry('maison', 'ev', { partOfSpeech: 'noun', gender: 'f', article: 'la', collocations: [{ phrase: 'x', translation: 'y', wrongVariants: [] }], frequencyRank: 100 })
    full.senses[0].examples.push({ text: 'Ma maison.', translation: 'Evim.', form: 'maison' })
    expect(fillMissing(full, donor())).toBeNull()
  })

  it('refuses an answer about another word', () => {
    expect(fillMissing(entry('maison', 'ev', { partOfSpeech: 'noun' }), donor({ lemma: 'maisonnette' }))).toBeNull()
  })

  it('takes a part of speech for an "other" word, and spelling aside from accents still matches', () => {
    const e = entry('élève', 'öğrenci', { partOfSpeech: 'other' })
    const d = createEntry({ word: 'eleve', meaning: 'öğrenci', partOfSpeech: 'noun', example: 'Cet *eleve* travaille.', exampleTranslation: 'Bu öğrenci çalışıyor.' }, 'fr', NOW)
    const next = fillMissing(e, { ...d, lemma: 'eleve' })!
    expect(next.partOfSpeech).toBe('noun')
  })
})
