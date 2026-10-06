import { describe, expect, it } from 'vitest'
import { KIN_COUNT, turkishKin } from '../turkishKin'

describe('Turkish kin', () => {
  it('finds the Turkish word a French, English or Spanish word gave', () => {
    expect(turkishKin({ language: 'fr', lemma: 'pantalon' })?.tr).toBe('pantolon')
    expect(turkishKin({ language: 'fr', lemma: 'le pantalon' })?.tr).toBe('pantolon')
    expect(turkishKin({ language: 'en', lemma: 'cake' })?.tr).toBe('kek')
    expect(turkishKin({ language: 'es', lemma: 'el tango' })?.tr).toBe('tango')
  })

  it('ignores accents and case, and the reflexive pronoun or "to"', () => {
    expect(turkishKin({ language: 'fr', lemma: 'Équipe' })?.tr).toBe('ekip')
    expect(turkishKin({ language: 'fr', lemma: 'equipe' })?.tr).toBe('ekip')
    expect(turkishKin({ language: 'en', lemma: 'to coach' })?.tr).toBe('koç')
  })

  it('says where the Turkish meaning has narrowed, and is silent for words with no kin', () => {
    expect(turkishKin({ language: 'fr', lemma: 'collège' })?.note).toMatch(/özel okul/)
    expect(turkishKin({ language: 'fr', lemma: 'maison' })).toBeUndefined()
    // A word is only kin in its own language: "cake" is not French.
    expect(turkishKin({ language: 'fr', lemma: 'cake' })).toBeUndefined()
  })

  it('has a useful number of words', () => {
    expect(KIN_COUNT).toBeGreaterThan(100)
  })
})
