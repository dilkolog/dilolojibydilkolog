import { describe, expect, it } from 'vitest'
import { readShared } from './incoming'

const q = (o: Record<string, string>) => new URLSearchParams(o)

describe('shared text from other apps', () => {
  it('takes a short selection as the word and keeps the link', () => {
    expect(readShared(q({ share_text: '“dépaysement”', share_url: 'https://lemonde.fr/a' }))).toEqual({ word: 'dépaysement', context: '', src: 'https://lemonde.fr/a' })
  })
  it('takes a sentence as context, with the link pulled out of the text', () => {
    const r = readShared(q({ share_text: 'Il a décidé de tout quitter pour vivre à la campagne. https://ex.fr/x' }))
    expect(r).toEqual({ word: '', context: 'Il a décidé de tout quitter pour vivre à la campagne.', src: 'https://ex.fr/x' })
  })
  it('ignores empty shares', () => {
    expect(readShared(q({ share_url: 'https://ex.fr' }))).toBeNull()
    expect(readShared(q({}))).toBeNull()
  })
})
