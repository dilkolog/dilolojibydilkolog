import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '../engine/gamification'
import { STAT_ART, drawnMedal } from './drawnArt'

describe('drawn medals', () => {
  it('give every badge a picture of its own kind', () => {
    const missing = [...new Set(ACHIEVEMENTS.map((a) => a.stat))].filter((stat) => !drawnMedal(stat))
    expect(missing).toEqual([])
  })

  it('exports matching kawaii stat mascot artwork', () => {
    expect(STAT_ART.sprout).toBeTruthy()
    expect(STAT_ART.star).toBeTruthy()
    expect(STAT_ART.book).toBeTruthy()
    expect(STAT_ART.flame).toBeTruthy()
    expect(STAT_ART.check).toBeTruthy()
  })
})
