import { describe, expect, it } from 'vitest'
import { findBosses } from '../bosses'
import { weeklyRace, weekStart } from '../race'
import { newWordState } from '../review'
import { decide, decision } from './fixtures'

const T = new Date('2026-10-01T10:00:00')

describe('bosses', () => {
  const leech = { ...newWordState(decision, T), stats: { reviews: 8, correct: 3, wrong: 5, hints: 0, totalResponseMs: 0, consecutiveWrong: 0 } }
  const fine = { ...newWordState(decide, T), stats: { reviews: 8, correct: 7, wrong: 1, hints: 0, totalResponseMs: 0, consecutiveWrong: 0 } }

  it('makes bosses of words that keep going wrong, with HP growing with the misses', () => {
    const bosses = findBosses([decision, decide], [leech, fine], [], [])
    expect(bosses.map((b) => b.entry.id)).toEqual(['en:decision'])
    expect(bosses[0].hp).toBe(9)
  })

  it('a beaten boss stays down until the word goes wrong again', () => {
    const win = { entryId: 'en:decision', at: T.toISOString(), wrongAtWin: 5 }
    expect(findBosses([decision], [leech], [], [win])).toHaveLength(0)
    const again = { ...leech, stats: { ...leech.stats, wrong: 6, reviews: 9 } }
    expect(findBosses([decision], [again], [], [win])[0]).toMatchObject({ rematch: true })
  })
})

describe('weekly race', () => {
  it('compares this week so far with last week up to the same weekday', () => {
    // 2026-10-01 is a Thursday; the week starts on Monday 28 September.
    expect(weekStart(T).toDateString()).toBe(new Date('2026-09-28T00:00:00').toDateString())
    const byDay = new Map([
      ['2026-09-28', 50], // this Monday
      ['2026-10-01', 30], // today
      ['2026-09-21', 40], // last Monday
      ['2026-09-24', 10], // last Thursday
      ['2026-09-26', 100], // last Saturday (after "so far")
      ["2026-09-14", 20], // the week before (beat the empty week before it, so the streak is 2)
    ])
    expect(weeklyRace(byDay, T)).toEqual({ thisWeek: 80, lastWeekSoFar: 50, lastWeekTotal: 150, streak: 2 })
  })
})
