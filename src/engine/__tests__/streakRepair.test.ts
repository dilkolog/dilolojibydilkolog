import { describe, expect, it } from 'vitest'
import { REPAIR_EVERY_DAYS, repairKey, repairOffer } from '../streakRepair'
import { streakWithFreezes } from '../insights'
import { localDate } from '../progress'

const NOW = new Date('2026-10-15T12:00:00')
const day = (n: number) => localDate(new Date(NOW.getTime() - n * 86_400_000))
/** Studied on these days ago (0 = today). */
const studied = (...ago: number[]) => ago.map(day)
const never = () => false

describe('winning a lost streak back', () => {
  it('offers to mend yesterday when it broke a run, and the mended day keeps the run', () => {
    const days = studied(2, 3, 4, 5, 6)
    expect(streakWithFreezes(days, NOW).streak).toBe(0)
    const offer = repairOffer(days, NOW, never)
    expect(offer).toEqual({ lost: 5, days: [day(1)] })
    expect(streakWithFreezes(days, NOW, (d) => offer!.days.includes(d)).streak).toBe(5)
    expect(repairKey(offer!)).toBe(day(1))
  })

  it('mends two missed days, and counts today once it is studied', () => {
    const offer = repairOffer(studied(0, 3, 4, 5, 6, 7), NOW, never)
    expect(offer).toEqual({ lost: 6, days: [day(2), day(1)] })
  })

  it('offers nothing for a short run, an old break, a rest day or a day a freeze covered', () => {
    expect(repairOffer(studied(2, 3), NOW, never)).toBeNull()
    expect(repairOffer(studied(4, 5, 6, 7, 8), NOW, never)).toBeNull()
    expect(repairOffer(studied(2, 3, 4, 5), NOW, (d) => d === day(1))).toBeNull()
    // Seven days in a row earn a freeze, which covers yesterday by itself.
    expect(repairOffer(studied(2, 3, 4, 5, 6, 7, 8), NOW, never)).toBeNull()
    expect(repairOffer(studied(0, 1, 2), NOW, never)).toBeNull()
  })

  it('waits two weeks after a mend before the next one', () => {
    const days = studied(2, 3, 4, 5)
    expect(repairOffer(days, NOW, never, [day(REPAIR_EVERY_DAYS - 1)])).toBeNull()
    expect(repairOffer(days, NOW, never, [day(REPAIR_EVERY_DAYS + 1)])).not.toBeNull()
  })
})
