import { describe, expect, it } from 'vitest'
import { accentRound, applyAccentShortcuts, gradeAccents, hasAccent } from '../accents'

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

describe('accent drill', () => {
  it('tells accented words apart', () => {
    expect(hasAccent('décision')).toBe(true)
    expect(hasAccent('niño')).toBe(true)
    expect(hasAccent("l'arbre")).toBe(false)
  })

  it('grades right, accent-only and wrong answers, marking the missed letter', () => {
    expect(gradeAccents('Décision ', 'décision').verdict).toBe('correct')
    const g = gradeAccents('decision', 'décision')
    expect(g.verdict).toBe('accent')
    expect(g.letters.filter((l) => l.missed).map((l) => l.ch)).toEqual(['é'])
    expect(gradeAccents('dècision', 'décision').verdict).toBe('accent')
    expect(gradeAccents('choix', 'décision').verdict).toBe('wrong')
    expect(gradeAccents('choix', 'décision').letters.some((l) => l.missed)).toBe(false)
  })

  it('builds a round of accented words, past accent mistakes first', () => {
    const words = [
      { id: 'a', word: 'été' },
      { id: 'b', word: 'arbre' },
      { id: 'c', word: 'français' },
      { id: 'd', word: 'élève' },
    ]
    const r = accentRound(words, new Set(['d']), 5, () => 0.3)
    expect(r.map((w) => w.id)).not.toContain('b')
    expect(r[0].id).toBe('d')
    expect(r).toHaveLength(3)
  })
})
