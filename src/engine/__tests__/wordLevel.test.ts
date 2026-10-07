import { describe, expect, it } from 'vitest'
import { levelFromRank } from '../wordLevel'

describe('a word\'s level from its frequency', () => {
  it('reads the rank into a CEFR band, and nothing for an unknown rank', () => {
    expect(levelFromRank(1)).toBe('A1')
    expect(levelFromRank(800)).toBe('A1')
    expect(levelFromRank(801)).toBe('A2')
    expect(levelFromRank(2500)).toBe('B1')
    expect(levelFromRank(4000)).toBe('B2')
    expect(levelFromRank(5000)).toBe('C1')
    expect(levelFromRank(12000)).toBe('C2')
    expect(levelFromRank(undefined)).toBeUndefined()
    expect(levelFromRank(-1)).toBeUndefined()
    expect(levelFromRank(0)).toBeUndefined()
  })
})
