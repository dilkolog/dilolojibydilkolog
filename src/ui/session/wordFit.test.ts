import { describe, expect, it } from 'vitest'
import { wordFit } from './wordFit'

describe('wordFit', () => {
  it('returns a CSS variable --len with the text length', () => {
    expect(wordFit('hello')).toEqual({ '--len': 5 })
    expect(wordFit('')).toEqual({ '--len': 0 })
    expect(wordFit('Contrat de location')).toEqual({ '--len': 19 })
  })

  it('correctly handles multi-word phrases and unicode text', () => {
    expect(wordFit('pomme de terre')).toEqual({ '--len': 14 })
    expect(wordFit('añadir')).toEqual({ '--len': 6 })
  })
})
