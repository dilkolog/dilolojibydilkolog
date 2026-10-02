import { describe, expect, it } from 'vitest'
import { analyzeText, keyUnknownWords } from '../reading'
import { lemmaOfForm } from '../../data/wordInfo'

describe('key words before reading', () => {
  it('picks the unknown words the text repeats, then the most common ones', () => {
    const text = 'The harbour was quiet. Boats left the harbour at dawn. A gull watched the harbour. The fog lingered and a bell tolled.'
    const a = analyzeText(text, 'en', [], [], new Set())
    const rank = (w: string) => ({ fog: 5000, bell: 3000, gull: 15000, lingered: 12000 })[w] ?? 99_999
    const words = keyUnknownWords(a, 'en', rank, 3)
    expect(words[0]).toMatchObject({ word: 'harbour', count: 3 })
    expect(words.slice(1).map((w) => w.word)).toEqual(['bell', 'fog'])
    expect(words[0].sentence).toBe('The harbour was quiet.')
  })

  it('finds the dictionary form behind an inflected Wiktionary entry', () => {
    expect(lemmaOfForm('# {{inflection of|fr|décider||m|s|past|part}}', 'fr')).toBe('décider')
    expect(lemmaOfForm('# {{plural of|es|casa}}', 'es')).toBe('casa')
    expect(lemmaOfForm('# {{es-verb form of|esperar}}', 'es')).toBe('esperar')
    expect(lemmaOfForm('# A building.', 'en')).toBeUndefined()
  })
})
