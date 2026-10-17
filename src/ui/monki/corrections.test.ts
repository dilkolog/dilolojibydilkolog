import { describe, expect, it } from 'vitest'
import { changedWord, parseCorrection } from './corrections'

describe('parseCorrection', () => {
  it('reads a quoted sentence and the reason after a dash', () => {
    expect(parseCorrection('Très bien ! Et pour boire ?\n✏️ Düzeltme: “Je voudrais un café” — “voudrais” kibar istek için.')).toEqual({
      sentence: 'Je voudrais un café',
      reason: '“voudrais” kibar istek için.',
    })
  })

  it('reads an unquoted sentence with a dash', () => {
    expect(parseCorrection('✏️ Düzeltme: Je suis allé au marché - passé composé ile.')).toEqual({ sentence: 'Je suis allé au marché', reason: 'passé composé ile.' })
  })

  it('reads bold labels and guillemets', () => {
    expect(parseCorrection('**✏️ Düzeltme:** «Ils ont mangé» (çoğul özne)')?.sentence).toBe('Ils ont mangé')
    expect(parseCorrection('- ✏️ **Düzeltme:** "Tengo hambre" — tener ile.')).toEqual({ sentence: 'Tengo hambre', reason: 'tener ile.' })
  })

  it('has none when there is no correction line, or the line is empty', () => {
    expect(parseCorrection('Harika gidiyorsun!')).toBeNull()
    expect(parseCorrection('✏️ Düzeltme:')).toBeNull()
  })
})

describe('changedWord', () => {
  it('finds the word that is new in the corrected sentence', () => {
    expect(changedWord('Je voudrais un café', 'Je veux un café')).toBe('voudrais')
  })
  it('takes the longest when several changed, and nothing without an original', () => {
    expect(changedWord('Nous sommes allés au marché', 'Nous avons allé au marche')).toBe('sommes')
    expect(changedWord('Je voudrais un café', undefined)).toBeUndefined()
    expect(changedWord('Un café', 'Un café')).toBeUndefined()
  })
})
