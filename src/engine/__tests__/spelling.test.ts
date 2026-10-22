import { describe, expect, it } from 'vitest'
import { createRng } from '../rng'
import { checkSpelling, spellable, spellingRound, spellOut, SPELL_ROUND } from '../spelling'

describe('spelling aloud', () => {
  it('says the letters by their names, accents and doubled letters the language\'s way', () => {
    expect(spellOut('fr', 'Bonjour')).toBe('bé, o, enne, ji, o, u, erre')
    expect(spellOut('fr', 'Hélène')).toBe('ache, e accent aigu, elle, e accent grave, enne, e')
    expect(spellOut('fr', 'belle')).toBe('bé, e, deux elle, e')
    expect(spellOut('fr', 'Rousseau')).toBe('erre, o, u, deux esse, e, a, u')
    expect(spellOut('fr', 'créé')).toBe('cé, erre, deux e accent aigu')
    expect(spellOut('fr', 'François')).toBe('effe, erre, a, enne, cé cédille, o, i, esse')
    expect(spellOut('es', 'Muñoz')).toBe('eme, u, eñe, o, zeta')
    expect(spellOut('es', 'Valladolid')).toBe('uve, a, doble ele, a, de, o, ele, i, de')
    expect(spellOut('es', 'García')).toBe('ge, a, erre, ce, i con tilde, a')
    expect(spellOut('en', 'Smith')).toBe('ess, em, eye, tee, aitch')
    expect(spellOut('en', 'Phillips')).toBe('pee, aitch, eye, double el, eye, pee, ess')
  })

  it('knows which words can be said', () => {
    expect(spellable('es', 'niño')).toBe(true)
    expect(spellable('en', 'niño')).toBe(false)
    expect(spellable('fr', 'l\'eau')).toBe(true)
  })

  it('checks a typed word: capitals do not count, a missing accent is near', () => {
    expect(checkSpelling('Hélène', 'hélène')).toBe('right')
    expect(checkSpelling('Hélène', 'Helene')).toBe('near')
    expect(checkSpelling('Hélène', 'Heleine')).toBe('wrong')
    expect(checkSpelling('Smith', '  ')).toBe('wrong')
    expect(checkSpelling("don't", 'don’t')).toBe('right')
    expect(checkSpelling('Isaac', 'İSAAC')).toBe('right')
    expect(checkSpelling('Isaac', 'ısaac')).toBe('right')
  })

  it('a round: own words without the article, the rest names; no repeats, all sayable', () => {
    const lemmas = ["L'homme", 'la maison', 'le chat', 'un', 'pomme de terre', 'l\'arbre', 'l\'arbre', 'anticonstitutionnellement']
    const round = spellingRound('fr', lemmas, createRng(1))
    expect(round).toHaveLength(SPELL_ROUND)
    expect(new Set(round.map((w) => w.toLowerCase())).size).toBe(SPELL_ROUND)
    expect(round).toEqual(expect.arrayContaining(['maison', 'chat', 'arbre', 'homme']))
    expect(round).not.toContain('un')
    expect(round.every((w) => spellable('fr', w))).toBe(true)
    for (const language of ['es', 'en'] as const) expect(spellingRound(language, [], createRng(2)).every((w) => spellable(language, w))).toBe(true)
  })
})
