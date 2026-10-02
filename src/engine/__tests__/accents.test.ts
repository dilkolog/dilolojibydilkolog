import { describe, expect, it } from 'vitest'
import { applyAccentShortcuts } from '../accents'

describe('accent shortcuts', () => {
  it('turns letter + mark into the accented letter', () => {
    expect(applyAccentShortcuts("de'cision", 'fr')).toBe('décision')
    expect(applyAccentShortcuts('tre`s fe^te', 'fr')).toBe('très fête')
    expect(applyAccentShortcuts("cancio'n espan~ol", 'es')).toBe('canción español')
    expect(applyAccentShortcuts("E'TE'", 'fr')).toBe('ÉTÉ')
  })

  it('leaves elisions and ordinary punctuation alone', () => {
    expect(applyAccentShortcuts("l'eau, qu'il, j'ai, donc, c'est", 'fr')).toBe("l'eau, qu'il, j'ai, donc, c'est")
    expect(applyAccentShortcuts("don't", 'en')).toBe("don't")
  })
})
