import { describe, expect, it } from 'vitest'
import { bodyPosition, skyPhase, visitors } from './GardenSky'

describe('garden sky', () => {
  it('follows the hour', () => {
    expect([4, 6, 12, 18, 21, 23.5].map(skyPhase)).toEqual(['night', 'dawn', 'day', 'dusk', 'night', 'night'])
  })

  it('puts the sun on its arc by day and the moon by night', () => {
    expect(bodyPosition(6)).toEqual({ body: 'sun', t: 0 })
    expect(bodyPosition(12.5).t).toBeCloseTo(0.5)
    expect(bodyPosition(19).body).toBe('moon')
    expect(bodyPosition(0).body).toBe('moon')
    expect(bodyPosition(5.9).t).toBeLessThan(1)
  })

  it('invites visitors in proportion to the garden, and none to an empty one', () => {
    expect(visitors(0, 0)).toEqual({ butterflies: 0, bees: 0 })
    expect(visitors(1, 1)).toEqual({ butterflies: 1, bees: 1 })
    expect(visitors(100, 100)).toEqual({ butterflies: 5, bees: 3 })
  })
})
