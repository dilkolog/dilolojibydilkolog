import { describe, expect, it } from 'vitest'
import { pickSentences, sentenceTokens } from './packSentences'

describe('example sentences for the pack', () => {
  it('splits a sentence into words, elisions too', () => {
    expect(sentenceTokens("L'homme n'a pas décidé, aujourd'hui !", 'fr')).toEqual(['l', 'homme', 'n', 'a', 'pas', 'décidé', 'aujourd', 'hui'])
  })

  it('keeps short sentences of frequent words, a different meaning each', () => {
    const easy = (w: string) => ['je', 'il', 'a', 'de', 'la', 'le', 'maison', 'est', 'grande', 'une', 'belle'].includes(w)
    const picked = pickSentences(
      [
        { text: 'La maison est grande.', turkish: 'Ev büyük.' },
        { text: 'Une belle maison.', turkish: 'Güzel bir ev.' },
        { text: 'La maison abandonnée dissimule un secret étrange.', turkish: 'Terk edilmiş ev tuhaf bir sır saklıyor.' },
        { text: 'La maison est grande et belle.', turkish: 'Ev büyük.' },
        { text: 'Maison.', turkish: 'Ev.' },
      ],
      'fr',
      easy,
    )
    // "Une belle maison." has three words (too short); the same Turkish twice counts once.
    expect(picked).toEqual([
      ['La maison est grande.', 'Ev büyük.'],
      ['La maison abandonnée dissimule un secret étrange.', 'Terk edilmiş ev tuhaf bir sır saklıyor.'],
    ])
  })
})
