import { describe, expect, it } from 'vitest'
import { MAX_RETURNS, requeue } from '../flashQueue'

describe('the order of a round of flashcards', () => {
  it('a known card leaves, a missed one comes back three cards on, a hard one six', () => {
    const q = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    expect(requeue(q, 2, 0)).toEqual(['b', 'c', 'd', 'e', 'f', 'g', 'h'])
    expect(requeue(q, 0, 0)).toEqual(['b', 'c', 'd', 'a', 'e', 'f', 'g', 'h'])
    expect(requeue(q, 1, 0)).toEqual(['b', 'c', 'd', 'e', 'f', 'g', 'a', 'h'])
  })

  it('near the end a card comes back last, and alone it comes back at once', () => {
    expect(requeue(['a', 'b'], 0, 0)).toEqual(['b', 'a'])
    expect(requeue(['a'], 0, 0)).toEqual(['a'])
  })

  it('a hard card comes back once, a missed one at most a few times', () => {
    expect(requeue(['a', 'b'], 1, 1)).toEqual(['b'])
    expect(requeue(['a', 'b'], 0, MAX_RETURNS - 1)).toEqual(['b', 'a'])
    expect(requeue(['a', 'b'], 0, MAX_RETURNS)).toEqual(['b'])
    expect(requeue([], 0, 0)).toEqual([])
  })
})
