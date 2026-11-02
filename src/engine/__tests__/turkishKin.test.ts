import { describe, expect, it } from 'vitest'
import { KIN_BY_LANGUAGE, KIN_COUNT, turkishKin } from '../turkishKin'

describe('Turkish kin', () => {
  it('finds the Turkish word a French, English or Spanish word shares', () => {
    expect(turkishKin({ language: 'fr', lemma: 'pantalon' })?.tr).toBe('pantolon')
    expect(turkishKin({ language: 'fr', lemma: 'le pantalon' })?.tr).toBe('pantolon')
    expect(turkishKin({ language: 'en', lemma: 'cake' })?.tr).toBe('kek')
    expect(turkishKin({ language: 'en', lemma: 'ambulance' })?.tr).toBe('ambulans')
    expect(turkishKin({ language: 'es', lemma: 'el tango' })?.tr).toBe('tango')
    expect(turkishKin({ language: 'es', lemma: 'la ambulancia' })?.tr).toBe('ambulans')
    expect(turkishKin({ language: 'es', lemma: 'la estación' })?.note).toMatch(/mevsim/)
  })

  it('ignores accents and case, and the reflexive pronoun or "to"', () => {
    expect(turkishKin({ language: 'fr', lemma: 'Équipe' })?.tr).toBe('ekip')
    expect(turkishKin({ language: 'fr', lemma: 'equipe' })?.tr).toBe('ekip')
    expect(turkishKin({ language: 'en', lemma: 'to coach' })?.tr).toBe('koç')
    expect(turkishKin({ language: 'es', lemma: 'Análisis' })?.tr).toBe('analiz')
  })

  it('says where the Turkish meaning has narrowed, and is silent for words with no kin', () => {
    expect(turkishKin({ language: 'fr', lemma: 'collège' })?.note).toMatch(/özel okul/)
    expect(turkishKin({ language: 'en', lemma: 'magazine' })?.note).toMatch(/dergi/)
    expect(turkishKin({ language: 'es', lemma: 'plaza' })?.note).toMatch(/meydan/)
    expect(turkishKin({ language: 'fr', lemma: 'maison' })).toBeUndefined()
    // A word is only kin in its own language: "cake" is not French.
    expect(turkishKin({ language: 'fr', lemma: 'cake' })).toBeUndefined()
  })

  it('has rich, balanced coverage across all three languages with zero duplicate keys', () => {
    expect(KIN_BY_LANGUAGE.fr).toBeGreaterThanOrEqual(115)
    expect(KIN_BY_LANGUAGE.en).toBeGreaterThanOrEqual(150)
    expect(KIN_BY_LANGUAGE.es).toBeGreaterThanOrEqual(150)
    expect(KIN_COUNT).toBe(KIN_BY_LANGUAGE.fr + KIN_BY_LANGUAGE.en + KIN_BY_LANGUAGE.es)
  })
})
