import { describe, expect, it } from 'vitest'
import type { VocabularyEntry } from '../engine/types'
import { glossOf } from './tapGloss'
import type { Pack } from './wordpackBuild'

const pack = {
  w: { tratar: { t: ['ele almak', 'davranmak', 'tedavi etmek', 'görüşmek'] }, tema: { t: ['konu [x]', 'tema'] }, casa: { t: ['ev'] } },
  f: { trata: 'tratar', trataba: 'tratar' },
} as unknown as Pack

const own = (lemma: string, gloss: string) => ({ language: 'es', lemma, senses: [{ gloss }] }) as unknown as VocabularyEntry

describe('glossOf', () => {
  it('gives the dictionary meaning of the word itself (three at most, bracketed notes left out)', () => {
    expect(glossOf(pack, 'casa', 'es')).toEqual({ word: 'casa', gloss: 'ev' })
    expect(glossOf(pack, 'Tema', 'es')).toEqual({ word: 'Tema', gloss: 'tema' })
    expect(glossOf(pack, 'tratar', 'es').gloss).toBe('ele almak, davranmak, tedavi etmek')
  })

  it('goes from an inflected form to its word', () => {
    expect(glossOf(pack, 'trata', 'es')).toEqual({ word: 'trata', lemma: 'tratar', gloss: 'ele almak, davranmak, tedavi etmek' })
  })

  it('prefers the learner\'s own meaning for a word on their list', () => {
    expect(glossOf(pack, 'casa', 'es', [own('casa', 'yuva')])).toEqual({ word: 'casa', gloss: 'yuva' })
  })

  it('returns the bare word when the dictionary does not have it, or there is no dictionary yet', () => {
    expect(glossOf(pack, 'zzz', 'es')).toEqual({ word: 'zzz' })
    expect(glossOf(undefined, 'casa', 'es')).toEqual({ word: 'casa' })
  })
})
