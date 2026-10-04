import { describe, expect, it } from 'vitest'
import { neighbours } from './wordOrder'

describe('word order', () => {
  const words = [
    { id: 'a', addedAt: new Date('2026-01-01') },
    { id: 'b', addedAt: new Date('2026-01-03') },
    { id: 'c', addedAt: new Date('2026-01-02') },
  ]

  it('steps through the list as it was last shown', () => {
    expect(neighbours('c', words, ['a', 'c', 'b'])).toEqual({ prev: 'a', next: 'b', index: 1, total: 3 })
    expect(neighbours('a', words, ['a', 'c', 'b'])).toMatchObject({ prev: undefined, next: 'c' })
  })

  it('falls back to newest first when the word is not in the saved list', () => {
    expect(neighbours('c', words, ['a'])).toEqual({ prev: 'b', next: 'a', index: 1, total: 3 })
  })
})
