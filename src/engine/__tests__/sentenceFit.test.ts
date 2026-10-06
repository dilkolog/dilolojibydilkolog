import { describe, expect, it } from 'vitest'
import { easyWords, rankByFit, sweetSpot, tokens, unknownCount } from '../sentenceFit'
import type { Example } from '../types'

const ex = (text: string, form = '', extra: Partial<Example> = {}): Example => ({ text, translation: '', form, ...extra })

// A tiny frequency list: rank = position.
const RANK = new Map(['the', 'is', 'very', 'big', 'house', 'old', 'my', 'was', 'and'].map((w, i) => [w, i + 1]))
const easy = easyWords('en', RANK, ['garden'])

describe('how well a sentence fits the learner', () => {
  it('splits a sentence into words, dropping the very short ones', () => {
    expect(tokens("L'arbre est très beau, à 12 ans.")).toEqual(['arbre', 'est', 'très', 'beau', 'ans'])
  })

  it('counts the words that are neither frequent nor the learner\'s own, not counting the target', () => {
    expect(unknownCount(ex('The house is very big', 'house'), 'house', easy)).toBe(0)
    expect(unknownCount(ex('The ephemeral house', 'house'), 'house', easy)).toBe(1)
    expect(unknownCount(ex('An ephemeral gossamer thing', 'thing'), 'thing', easy)).toBe(2)
    // The learner's own word counts as known.
    expect(unknownCount(ex('The garden is big', ''), 'house', easy)).toBe(0)
  })

  it('puts the best fit first, shorter before longer, and keeps the order of equals', () => {
    const list = [ex('An ephemeral gossamer thing is here', 'thing'), ex('The old house was big and very old indeed', 'house'), ex('My house was old', 'house'), ex('The big house', 'house')]
    const ranked = rankByFit(list, 'house', easy)
    expect(ranked.map((x) => x.text)).toEqual(['The big house', 'My house was old', 'The old house was big and very old indeed', 'An ephemeral gossamer thing is here'].sort((a, b) => ranked.map((x) => x.text).indexOf(a) - ranked.map((x) => x.text).indexOf(b)))
    expect(ranked[0].text).toBe('The big house')
    expect(ranked.at(-1)!.text).toBe('An ephemeral gossamer thing is here')
    expect(ranked.every((x) => typeof x.fit === 'number')).toBe(true)
  })

  it('"sweet spot" sentences have at most one unknown word; with none, all are offered', () => {
    const rated = [ex('a', '', { fit: 0 }), ex('b', '', { fit: 1 }), ex('c', '', { fit: 3 })]
    expect(sweetSpot(rated).map((x) => x.text)).toEqual(['a', 'b'])
    expect(sweetSpot([ex('c', '', { fit: 3 }), ex('d', '', { fit: 4 })]).map((x) => x.text)).toEqual(['c', 'd'])
    // Not yet rated: all of them, as before.
    expect(sweetSpot([ex('x'), ex('y')]).map((x) => x.text)).toEqual(['x', 'y'])
  })
})
