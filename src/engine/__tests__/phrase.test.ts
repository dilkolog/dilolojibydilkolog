import { describe, expect, it } from 'vitest'
import { phraseAround, wordIndex } from '../phrase'

const S = "Elle a envie de partir, aujourd'hui."

describe('phrase window', () => {
  it('finds the tapped word, case and apostrophes aside', () => {
    expect(wordIndex(S, 'envie', 'fr')).toBe(2)
    expect(wordIndex(S, 'ENVIE', 'fr')).toBe(2)
    expect(wordIndex(S, "aujourd'hui", 'fr')).toBe(5)
    expect(wordIndex(S, 'absent', 'fr')).toBe(-1)
    // The bare word of an elision is found in "l'amie".
    expect(wordIndex("C'est l'amie de Paul.", 'amie', 'fr')).toBe(1)
  })

  it('widens one word at a time on either side and stops at the sentence ends', () => {
    expect(phraseAround(S, 2, 0, 0)).toEqual({ text: 'envie', left: 2, right: 3 })
    expect(phraseAround(S, 2, 0, 1)).toEqual({ text: 'envie de', left: 2, right: 2 })
    expect(phraseAround(S, 2, 1, 1)).toEqual({ text: 'a envie de', left: 1, right: 2 })
    expect(phraseAround(S, 2, 9, 9)).toEqual({ text: "Elle a envie de partir, aujourd'hui", left: 0, right: 0 })
  })

  it('keeps punctuation inside a phrase and drops it from the ends', () => {
    expect(phraseAround(S, 3, 0, 1)?.text).toBe('de partir')
    expect(phraseAround(S, 4, 0, 1)?.text).toBe("partir, aujourd'hui")
  })

  it('keeps hyphenated words whole and nothing for an index that is not there', () => {
    expect(phraseAround('Il est peut-être là.', 2, 0, 0)?.text).toBe('peut-être')
    expect(phraseAround(S, -1, 0, 0)).toBeNull()
    expect(phraseAround(S, 99, 0, 0)).toBeNull()
  })
})
