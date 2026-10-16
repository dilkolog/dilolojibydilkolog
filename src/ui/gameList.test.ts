import { describe, expect, it } from 'vitest'
import { GAME_LIST } from './gameList'

describe('gameList', () => {
  it('contains unique game IDs for all registered games', () => {
    const ids = GAME_LIST.map((g) => g.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
    expect(ids.length).toBeGreaterThanOrEqual(25)
  })

  it('ensures every game has a non-empty name and emoji', () => {
    for (const game of GAME_LIST) {
      expect(game.id).toBeTruthy()
      expect(game.name.trim().length).toBeGreaterThan(0)
      expect(game.emoji.trim().length).toBeGreaterThan(0)
    }
  })

  it('marks grammar-specific games correctly', () => {
    const grammarGames = GAME_LIST.filter((g) => g.grammar).map((g) => g.id)
    expect(grammarGames).toContain('article')
    expect(grammarGames).toContain('conjugation')
    expect(grammarGames).toContain('aspect')
    expect(grammarGames).toContain('gender')
  })
})
