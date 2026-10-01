import { describe, expect, it } from 'vitest'
import { checkSentence, checkTyped, levenshtein, normalize } from '../answerCheck'

describe('normalize', () => {
  it('lowercases, trims and unifies apostrophes', () => {
    expect(normalize('  L’Arbre  ')).toBe("l'arbre")
    expect(normalize("l' arbre")).toBe("l'arbre")
    expect(normalize('¿Qué?')).toBe('qué')
  })
})

describe('levenshtein', () => {
  it('computes edit distance', () => {
    expect(levenshtein('decision', 'decison')).toBe(1)
    expect(levenshtein('abc', 'abc')).toBe(0)
  })
})

describe('checkTyped — English', () => {
  const en = { language: 'en' as const }
  it('accepts exact answers and ignores articles / infinitive "to"', () => {
    expect(checkTyped('decision', ['decision'], en).verdict).toBe('correct')
    expect(checkTyped('a decision', ['decision'], en).verdict).toBe('correct')
    expect(checkTyped('to abandon', ['abandon'], en).verdict).toBe('correct')
  })
  it('treats a small typo as near, scaled by word length', () => {
    expect(checkTyped('decison', ['decision'], en)).toEqual({ verdict: 'near', errorType: 'typo' })
    expect(checkTyped('car', ['cat'], en).verdict).toBe('wrong')
  })
  it('classifies confusables and family forms', () => {
    expect(checkTyped('effect', ['affect'], { ...en, confusables: ['effect'] }).errorType).toBe('confusion')
    expect(checkTyped('decide', ['decision'], { ...en, familyForms: ['decide'] }).errorType).toBe('form')
    expect(checkTyped('banana', ['decision'], en).errorType).toBe('meaning')
  })
  it('rejects empty answers', () => {
    expect(checkTyped('  ', ['decision'], en).verdict).toBe('wrong')
  })
})

describe('checkTyped — French / Spanish articles and accents', () => {
  const fr = { language: 'fr' as const, gender: 'f' as const }
  it('accepts the article of the same gender', () => {
    expect(checkTyped('la décision', ['la décision'], fr).verdict).toBe('correct')
    expect(checkTyped('une décision', ['la décision'], fr).verdict).toBe('correct')
  })
  it('flags wrong gender as an error', () => {
    expect(checkTyped('le décision', ['la décision'], fr)).toEqual({ verdict: 'wrong', errorType: 'gender' })
  })
  it('flags a missing article as near', () => {
    expect(checkTyped('décision', ['la décision'], fr)).toEqual({ verdict: 'near', errorType: 'article' })
  })
  it('flags missing accents as near', () => {
    expect(checkTyped('la decision', ['la décision'], fr)).toEqual({ verdict: 'near', errorType: 'accent' })
    expect(checkTyped('decision', ['la décision'], fr)).toEqual({ verdict: 'near', errorType: 'accent' })
  })
  it("resolves the gender of l' from the entry", () => {
    const m = { language: 'fr' as const, gender: 'm' as const }
    expect(checkTyped('un arbre', ["l'arbre"], m).verdict).toBe('correct')
    expect(checkTyped('une arbre', ["l'arbre"], m).errorType).toBe('gender')
  })
  it('handles Spanish ñ as an accent slip and el/la as gender', () => {
    const es = { language: 'es' as const, gender: 'm' as const }
    expect(checkTyped('el ano', ['el año'], es)).toEqual({ verdict: 'near', errorType: 'accent' })
    expect(checkTyped('la año', ['el año'], es).errorType).toBe('gender')
  })
})

describe('checkSentence (dictation)', () => {
  it('accepts the sentence ignoring case and punctuation', () => {
    expect(checkSentence('it was a difficult decision', 'It was a difficult decision.', 'en').verdict).toBe('correct')
  })
  it('treats accent slips and small typos as near', () => {
    expect(checkSentence("c'est une decision difficile", "C'est une décision difficile.", 'fr')).toMatchObject({ verdict: 'near', errorType: 'accent' })
    expect(checkSentence('it was a dificult decision', 'It was a difficult decision.', 'en')).toMatchObject({ verdict: 'near', errorType: 'typo' })
  })
  it('counts missing or wrong words without shifting the rest', () => {
    expect(checkSentence('it was difficult decision', 'It was a difficult decision.', 'en')).toMatchObject({ verdict: 'wrong', wrongWords: 1 })
    expect(checkSentence('it is a difficult choice', 'It was a difficult decision.', 'en').wrongWords).toBe(2)
  })
})
