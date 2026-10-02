import { describe, expect, it } from 'vitest'
import { parseClippings, vocabRowsToWords } from '../kindle'

describe('Kindle clippings', () => {
  it('turns short highlights into words, with a longer highlight from the same book as context', () => {
    const raw = `﻿Le Petit Prince (Saint-Exupéry)
- Votre surlignement à l'emplacement 120-121 | Ajouté le lundi 1 janvier 2024

apprivoiser
==========
Le Petit Prince (Saint-Exupéry)
- Votre surlignement à l'emplacement 122-125 | Ajouté le lundi 1 janvier 2024

« Qu'est-ce que signifie apprivoiser ? » demanda le petit prince.
==========
Autre livre
- Your Highlight on Location 10

éphémère,
==========
Le Petit Prince (Saint-Exupéry)
- Votre surlignement

Apprivoiser
==========
`
    const words = parseClippings(raw)
    expect(words.map((w) => w.word)).toEqual(['apprivoiser', 'éphémère'])
    expect(words[0].context).toContain('signifie apprivoiser')
    expect(words[1].context).toBeUndefined()
  })
})

describe('Kindle Vocabulary Builder', () => {
  it('keeps the chosen language, prefers the dictionary form and the newest sentence', () => {
    const rows = [
      { word: 'mangeait', stem: 'manger', lang: 'fr', usage: 'Il mangeait seul.', book: 'A', timestamp: 1 },
      { word: 'mangé', stem: 'manger', lang: 'fr', usage: 'Elle a mangé tôt.', book: 'B', timestamp: 5 },
      { word: 'house', stem: 'house', lang: 'en', usage: 'A house.', book: 'C', timestamp: 3 },
    ]
    expect(vocabRowsToWords(rows, 'fr')).toEqual([{ word: 'manger', context: 'Elle a mangé tôt.', book: 'B' }])
  })
})
