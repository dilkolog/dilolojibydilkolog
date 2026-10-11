import { describe, expect, it } from 'vitest'
import { extractCandidates, findExampleSentences, splitSentences, stem } from '../extract'
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

describe('findExampleSentences', () => {
  it('finds one sentence per known word, inflected forms included', () => {
    const text = 'We decided to leave early that day. It was a hard decision for all of us. Decide!'
    const found = findExampleSentences(text, 'en', [decide, decision])
    expect(found).toEqual([
      { entryId: 'en:decide', text: 'We decided to leave early that day.', form: 'decided' },
      { entryId: 'en:decision', text: 'It was a hard decision for all of us.', form: 'decision' },
    ])
  })

  it('skips sentences the word already has and very short ones', () => {
    const existing = decision.senses[0].examples[0].text
    expect(findExampleSentences(`${existing} Decision made.`, 'en', [decision])).toEqual([])
  })
})

describe('words around a double hyphen', () => {
  it('are two words, as in the reader, while a hyphen between letters keeps one', () => {
    const forms = extractCandidates('Durante tres meses--vivieron una dicha profunda, un arc-en-ciel apareció.', 'es', []).map((c) => c.surface)
    expect(forms).toContain('meses')
    expect(forms).toContain('vivieron')
    expect(forms.some((f) => f.includes('--'))).toBe(false)
    expect(forms).toContain('arc-en-ciel')
  })
})
