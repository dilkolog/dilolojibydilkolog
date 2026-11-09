import { describe, expect, it } from 'vitest'
import { GAME_ART } from './gameArt'
import { GAME_LIST } from './gameList'

describe('the games\' drawn signs', () => {
  it('belong to games that exist, each picture used once', () => {
    const ids = new Set(GAME_LIST.map((g) => g.id))
    for (const id of Object.keys(GAME_ART)) expect(ids.has(id as never), id).toBe(true)
    const pictures = Object.values(GAME_ART)
    expect(new Set(pictures).size).toBe(pictures.length)
    expect(pictures.every((p) => typeof p === 'string' && p.length > 0)).toBe(true)
  })
})
