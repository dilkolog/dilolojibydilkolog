import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '../engine/gamification'
import { drawnMedal } from './drawnArt'

describe('drawn medals', () => {
  it('give every badge a picture of its own kind', () => {
    const missing = [...new Set(ACHIEVEMENTS.map((a) => a.stat))].filter((stat) => !drawnMedal(stat))
    expect(missing).toEqual([])
  })
})
