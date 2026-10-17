import { describe, expect, it } from 'vitest'
import { createEntry } from '../../data/wordInput'
import { giftMatches, giftOf, MAX_SENT, sentTextOf } from '../friendGifts'

describe('giftOf', () => {
  it('sends the word with its article, up to three meanings and the first sentence with its Turkish', () => {
    const entry = createEntry({ word: 'la maison', meaning: 'ev, konut, yuva, hane', example: 'La maison est grande.', exampleTranslation: 'Ev büyük.' }, 'fr', new Date())
    expect(giftOf(entry)).toEqual({ language: 'fr', lemma: 'la maison', meaning: 'ev, konut, yuva', example: 'La maison est grande.', exampleTranslation: 'Ev büyük.' })
  })
  it('has no sentence when the word has none', () => {
    const entry = createEntry({ word: 'pomme', meaning: 'elma' }, 'fr', new Date())
    expect(giftOf(entry)).toEqual({ language: 'fr', lemma: 'pomme', meaning: 'elma' })
  })
})

describe('sentTextOf', () => {
  it('keeps a short text whole', () => {
    expect(sentTextOf({ language: 'fr', title: 'T', text: '  Bonjour tout le monde.  ' })).toEqual({ language: 'fr', title: 'T', body: 'Bonjour tout le monde.' })
  })
  it('cuts a long text at the end of a sentence', () => {
    const long = 'Une phrase assez courte. '.repeat(300)
    const out = sentTextOf({ language: 'fr', title: 'T', text: long })
    expect(out.body.length).toBeLessThanOrEqual(MAX_SENT)
    expect(out.body.endsWith('.')).toBe(true)
  })
})

describe('giftMatches', () => {
  const words = ['maison', 'maisonnette', 'amie', 'pomme'].map((w, i) => createEntry({ word: w, meaning: i === 2 ? 'arkadaş (kadın)' : 'x' }, 'fr', new Date()))
  it('finds by word or meaning, the word starting with it first', () => {
    expect(giftMatches(words, 'mais').map((w) => w.lemma)).toEqual(['maison', 'maisonnette'])
    expect(giftMatches(words, 'arkadaş').map((w) => w.lemma)).toEqual(['amie'])
    expect(giftMatches(words, '')).toEqual([])
  })
})
