import { describe, expect, it } from 'vitest'
import { extractCandidates, splitSentences, stem } from '../extract'
import { decide, decision } from './fixtures'

describe('stem', () => {
  it('groups common inflections', () => {
    expect(stem('decided', 'en')).toBe(stem('decide', 'en'))
    expect(stem('decides', 'en')).toBe(stem('decide', 'en'))
    expect(stem('abandoning', 'en')).toBe(stem('abandon', 'en'))
    expect(stem('mangeons', 'fr')).toBe(stem('manger', 'fr'))
    expect(stem('hablando', 'es')).toBe(stem('hablar', 'es'))
  })
  it('does not collapse short words', () => {
    expect(stem('bus', 'en')).toBe('bus')
  })
})

describe('splitSentences', () => {
  it('splits on sentence punctuation and newlines', () => {
    expect(splitSentences('One. Two!\nThree? Four…  Five')).toEqual(['One.', 'Two!', 'Three?', 'Four…', 'Five'])
  })
})

describe('extractCandidates', () => {
  const text = `Yesterday Maria decided to abandon the project. She abandoned it because the deadline was impossible.
    The team was exhausted, and the deadline kept moving. Maria said the decision was hard.`

  it('skips function words, names and known words (including inflections)', () => {
    const c = extractCandidates(text, 'en', [decide, decision])
    const words = c.flatMap((x) => x.forms)
    expect(words).not.toContain('the')
    expect(words).not.toContain('maria')
    expect(words).not.toContain('decided')
    expect(words).not.toContain('decision')
    expect(words).toEqual(expect.arrayContaining(['abandon', 'deadline', 'exhausted']))
  })

  it('groups inflections, ranks by frequency and keeps the first sentence as context', () => {
    const c = extractCandidates(text, 'en', [])
    const abandon = c.find((x) => x.forms.includes('abandon'))!
    expect(abandon.forms.sort()).toEqual(['abandon', 'abandoned'])
    expect(abandon.count).toBe(2)
    expect(abandon.context).toBe('Yesterday Maria decided to abandon the project.')
    expect(c[0].count).toBeGreaterThanOrEqual(c[c.length - 1].count)
  })

  it('splits French elisions', () => {
    const c = extractCandidates("L'arbre est grand. J'aime l'arbre et l'océan.", 'fr', [])
    expect(c.map((x) => x.surface)).toEqual(expect.arrayContaining(['arbre', 'océan', 'aime']))
    expect(c.find((x) => x.surface === 'arbre')!.count).toBe(2)
  })

  it('respects the limit and minimum length', () => {
    expect(extractCandidates(text, 'en', [], { limit: 2 })).toHaveLength(2)
    expect(extractCandidates('ox ax', 'en', [])).toEqual([])
  })
})
