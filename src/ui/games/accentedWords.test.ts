import { describe, expect, it } from 'vitest'
import { decide, decision, elAno, laDecision, lArbre } from '../../engine/__tests__/fixtures'
import { ACCENT_MIN_WORDS, accentedWords } from './accentedWords'

describe('accentedWords', () => {
  it('defines ACCENT_MIN_WORDS threshold as 4', () => {
    expect(ACCENT_MIN_WORDS).toBe(4)
  })

  it('filters vocabulary entries that contain diacritics or accents in their display form', () => {
    const list = [decision, decide, laDecision, lArbre, elAno]
    const accented = accentedWords(list)

    // laDecision (la décision) and elAno (el año) have accents ('é', 'ñ')
    expect(accented).toHaveLength(2)
    expect(accented.map((v) => v.id)).toEqual(['fr:décision', 'es:año'])
  })

  it('returns empty array when no words have accents', () => {
    expect(accentedWords([decision, decide, lArbre])).toEqual([])
    expect(accentedWords([])).toEqual([])
  })
})
