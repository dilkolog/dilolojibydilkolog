import { describe, expect, it } from 'vitest'
import { bodyPosition, PHASE_NAME, skyPhase, visitors } from './gardenSkyCalculations'

describe('gardenSkyCalculations', () => {
  describe('skyPhase', () => {
    it('identifies dawn between 5:30 and 8:00', () => {
      expect(skyPhase(5.5)).toBe('dawn')
      expect(skyPhase(6)).toBe('dawn')
      expect(skyPhase(7.99)).toBe('dawn')
    })

    it('identifies day between 8:00 and 17:00', () => {
      expect(skyPhase(8)).toBe('day')
      expect(skyPhase(12)).toBe('day')
      expect(skyPhase(16.99)).toBe('day')
    })

    it('identifies dusk between 17:00 and 20:30', () => {
      expect(skyPhase(17)).toBe('dusk')
      expect(skyPhase(19)).toBe('dusk')
      expect(skyPhase(20.49)).toBe('dusk')
    })

    it('identifies night after 20:30 and before 5:30', () => {
      expect(skyPhase(20.5)).toBe('night')
      expect(skyPhase(23)).toBe('night')
      expect(skyPhase(0)).toBe('night')
      expect(skyPhase(3)).toBe('night')
      expect(skyPhase(5.49)).toBe('night')
    })
  })

  describe('PHASE_NAME', () => {
    it('has Turkish localized names for all 4 sky phases', () => {
      expect(PHASE_NAME.dawn).toBe('Sabah')
      expect(PHASE_NAME.day).toBe('Gündüz')
      expect(PHASE_NAME.dusk).toBe('Akşam')
      expect(PHASE_NAME.night).toBe('Gece')
    })
  })

  describe('bodyPosition', () => {
    it('calculates sun position from 6:00 to 19:00', () => {
      const dawn = bodyPosition(6)
      expect(dawn.body).toBe('sun')
      expect(dawn.t).toBeCloseTo(0)

      const noon = bodyPosition(12.5)
      expect(noon.body).toBe('sun')
      expect(noon.t).toBeCloseTo(0.5)

      const sunset = bodyPosition(18.99)
      expect(sunset.body).toBe('sun')
      expect(sunset.t).toBeGreaterThan(0.9)
    })

    it('calculates moon position from 19:00 to 6:00', () => {
      const moonRise = bodyPosition(19)
      expect(moonRise.body).toBe('moon')
      expect(moonRise.t).toBeCloseTo(0)

      const midnight = bodyPosition(0)
      expect(midnight.body).toBe('moon')
      // (0 - 19 + 24) % 24 = 5; 5 / 11 ~ 0.4545
      expect(midnight.t).toBeCloseTo(5 / 11)

      const lateNight = bodyPosition(5.5)
      expect(lateNight.body).toBe('moon')
      // (5.5 - 19 + 24) % 24 = 10.5; 10.5 / 11 ~ 0.9545
      expect(lateNight.t).toBeCloseTo(10.5 / 11)
    })
  })

  describe('visitors', () => {
    it('returns 0 visitors when there are no flowers or growing plants', () => {
      expect(visitors(0, 0)).toEqual({ butterflies: 0, bees: 0 })
    })

    it('calculates butterflies based on flower count up to a maximum of 5', () => {
      expect(visitors(1, 0).butterflies).toBe(1)
      expect(visitors(4, 0).butterflies).toBe(1)
      expect(visitors(5, 0).butterflies).toBe(2)
      expect(visitors(12, 0).butterflies).toBe(3)
      expect(visitors(20, 0).butterflies).toBe(5)
      expect(visitors(100, 0).butterflies).toBe(5)
    })

    it('calculates bees based on growing plants count up to a maximum of 3', () => {
      expect(visitors(0, 1).bees).toBe(1)
      expect(visitors(0, 10).bees).toBe(1)
      expect(visitors(0, 11).bees).toBe(2)
      expect(visitors(0, 30).bees).toBe(3)
      expect(visitors(0, 50).bees).toBe(3)
    })
  })
})
