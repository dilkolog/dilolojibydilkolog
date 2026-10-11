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

  const hidden = (text: string, language: 'fr' | 'es' = 'fr') => {
    const paragraphs = analyzeText(text, language, [], [], new Set()).paragraphs
    return [...maskPositions(paragraphs, language)].map((p) => {
      const [i, j, k] = p.split('.').map(Number)
      return paragraphs[i][j].tokens[k].text
    })
  }

  it('does not glue two words together over a double hyphen, and skips hyphenated grammar', () => {
    expect(hidden('Durante tres meses--se habían casado en abril--vivieron una dicha profunda', 'es')).toEqual(['vivieron'])
    expect(hidden("Est-ce que tu n'as pas honte, à la fin de cette histoire ?")).toEqual(['histoire'])
    expect(hidden('Imaginez-vous pour un moment, chers lecteurs, ce vieux village')).toEqual(['lecteurs'])
  })

  it('does not hide names: a capital in mid-sentence, or two at the start', () => {
    expect(hidden('Francet Mamaï, un vieux joueur de fifre, habitait ce village')).toEqual(['habitait'])
    expect(hidden('Nous avons vu Gringoire hier près de la rivière')).toEqual(['rivière'])
  })

  it('asks in a text of short sentences too, from four words', () => {
    expect(hidden('Le garçon cherche ses chaussures. Il court dehors. Elle chante bien.')).toEqual(['chaussures'])
    // Not short on average: the six-word rule stays.
    expect(hidden('Le garçon cherche ses chaussures. Hier soir, nous avons mangé des champignons délicieux avec nos voisins.')).toEqual(['champignons'])
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
