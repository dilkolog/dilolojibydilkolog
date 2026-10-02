import { describe, expect, it } from 'vitest'
import { minePatterns, wrongVariantsFor } from '../patterns'

const isDecision = (t: string) => /^d[ée]cisi[oó]ns?$/i.test(t)

describe('collocation mining', () => {
  const sentences = [
    'We have to make a decision today.',
    'She made a decision without us.',
    'He will make a decision tomorrow.',
    'Making a decision is hard.',
    'Tom made a decision.',
    'Tom regrets the decision to leave.',
    'Mary questioned the decision to leave.',
    'It was a decision to leave early.',
    'A good decision takes time.',
    'That was a good decision.',
    'Leaving was a good decision.',
    'Tom supported the decision.',
    'Mary supported the decision.',
  ]

  it('finds frequent neighbours, ignoring names and bare articles', () => {
    const p = minePatterns(sentences, 'en', isDecision, 6, 3)
    const phrases = p.map((x) => x.phrase)
    expect(phrases[0]).toMatch(/^(make|made|making) a decision$/)
    expect(p[0].count).toBe(5)
    expect(phrases).toContain('decision to leave')
    expect(phrases).toContain('good decision')
    expect(phrases.some((x) => /tom|mary/.test(x))).toBe(false)
    expect(phrases).not.toContain('a decision')
    expect(phrases).not.toContain('the decision')
  })

  it('does not keep a pattern inside a better one', () => {
    const phrases = minePatterns(sentences, 'en', isDecision, 6, 3).map((x) => x.phrase)
    expect(phrases.filter((x) => x.includes('decision to')).length).toBe(1)
  })
})

describe('wrong variants', () => {
  it('swaps light verbs in the same form and prepositions', () => {
    expect(wrongVariantsFor('made a decision', 'en')).toEqual(['did a decision', 'took a decision', 'had a decision'])
    expect(wrongVariantsFor('tomar una decisión', 'es')).toEqual(['hacer una decisión', 'tener una decisión', 'dar una decisión'])
    expect(wrongVariantsFor('depends on', 'en')).toEqual(['depends to', 'depends in', 'depends of'])
    expect(wrongVariantsFor('bonne décision', 'fr')).toEqual([])
  })
})
