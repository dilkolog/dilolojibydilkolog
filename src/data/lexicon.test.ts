import { describe, expect, it } from 'vitest'
import { lexiconUpdate, lookUpLexicon, parseLexicon } from './lexicon'
import type { VocabularyEntry } from '../engine/types'

describe('French lexicon', () => {
  const lex = parseLexicon('asile\tnm\nfort\tadnm\nlivre\tn\nélève\tne\ntassé\ta\n')

  it('reads parts of speech, most frequent first, and noun gender', () => {
    expect(lex.get('asile')).toEqual({ pos: ['noun'], gender: 'm' })
    expect(lex.get('fort')).toEqual({ pos: ['adjective', 'adverb', 'noun'], gender: 'm' })
    expect(lex.get('livre')).toEqual({ pos: ['noun'] })
    expect(lex.get('élève')?.gender).toBe('mf')
  })

  it('finds a word typed with an article or a capital', () => {
    expect(lookUpLexicon(lex, "l'asile", 'fr')?.gender).toBe('m')
    expect(lookUpLexicon(lex, 'Tassé', 'fr')?.pos[0]).toBe('adjective')
    expect(lookUpLexicon(lex, 'asile', 'en')).toBeDefined()
    expect(lookUpLexicon(undefined, 'asile', 'fr')).toBeUndefined()
  })

  it('fills only what is missing', () => {
    const word = (lemma: string, extra: Partial<VocabularyEntry>) => ({ lemma, language: 'fr', source: 'user', partOfSpeech: 'other', ...extra }) as VocabularyEntry
    expect(lexiconUpdate(word('tassé', {}), lex)).toEqual({ partOfSpeech: 'adjective' })
    expect(lexiconUpdate(word('asile', {}), lex)).toEqual({ partOfSpeech: 'noun', gender: 'm' })
    expect(lexiconUpdate(word('asile', { partOfSpeech: 'noun', gender: 'f' }), lex)).toBeUndefined()
    expect(lexiconUpdate(word('fort', { partOfSpeech: 'adverb' }), lex)).toBeUndefined()
    expect(lexiconUpdate(word('asile', { source: 'sample' }), lex)).toBeUndefined()
  })
})
