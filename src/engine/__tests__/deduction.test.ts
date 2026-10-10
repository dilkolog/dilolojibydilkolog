import { describe, expect, it } from 'vitest'
import { guessSummary, mergeDeductionLogs, maskPositions, MASK_MAX, posKey, recordGuess } from '../deduction'
import { analyzeText, readingKey } from '../reading'

const analyze = (text: string) => analyzeText(text, 'fr', [], [], new Set()).paragraphs

describe('maskPositions', () => {
  it('hides the longest unseen word of a sentence that has context, once per sentence', () => {
    const paragraphs = analyze("Hier soir, nous avons mangé des champignons délicieux avec nos voisins. Il pleut.")
    const masks = maskPositions(paragraphs, 'fr')
    expect(masks.size).toBe(1)
    const [i, j, k] = [...masks][0].split('.').map(Number)
    expect(paragraphs[i][j].tokens[k].text).toBe('champignons')
  })

  it('leaves short sentences, short words and known words alone', () => {
    expect(maskPositions(analyze('Le chat dort sur la mer.'), 'fr').size).toBe(0)
    const known = analyzeText('Il y a beaucoup de gens dans la rue ici', 'fr', [], [], new Set([readingKey('beaucoup', 'fr')])).paragraphs
    // "beaucoup" is the only long word and it is known.
    expect(maskPositions(known, 'fr').size).toBe(0)
  })

  it('never hides more than the cap in one text', () => {
    const sentence = 'Nous avons mangé hier soir beaucoup de champignons délicieux. '
    expect(maskPositions(analyze(sentence.repeat(40)), 'fr').size).toBe(MASK_MAX)
  })

  it('gives each position as paragraph.sentence.token', () => {
    expect(posKey(1, 2, 3)).toBe('1.2.3')
  })
})

describe('the guess log', () => {
  it('counts per language and rating, and merges two devices by the larger counts', () => {
    let a = recordGuess({}, 'fr', 'exact')
    a = recordGuess(a, 'fr', 'close')
    a = recordGuess(a, 'fr', 'exact')
    expect(a.fr).toEqual({ exact: 2, close: 1, surprised: 0 })
    const b = recordGuess(recordGuess({}, 'fr', 'surprised'), 'es', 'exact')
    expect(mergeDeductionLogs(a, b)).toEqual({ fr: { exact: 2, close: 1, surprised: 1 }, es: { exact: 1, close: 0, surprised: 0 } })
    expect(mergeDeductionLogs(undefined, undefined)).toEqual({})
  })

  it('says nothing before the first guess', () => {
    expect(guessSummary(undefined)).toBeNull()
    expect(guessSummary({ exact: 3, close: 2, surprised: 1 })).toBe('6 tahmin: 3 tam, 2 yakın, 1 şaşırttı')
  })
})
