import { describe, expect, it } from 'vitest'
import { award, certAwardKey, cleanLedger, CERT_XP, ledgerByDay, lessonAwardKey, mergeLedgers, reviewAwardKey, timeAwardKey, timeXp, TIME_DAY_CAP } from '../xpLedger'

describe('xp ledger', () => {
  it('gives 5 XP per full five minutes, at most 30 a day', () => {
    expect(timeXp(0)).toBe(0)
    expect(timeXp(299)).toBe(0)
    expect(timeXp(300)).toBe(5)
    expect(timeXp(899)).toBe(10)
    expect(timeXp(60 * 60)).toBe(TIME_DAY_CAP)
    expect(timeXp(-10)).toBe(0)
  })

  it('never lowers an award and keeps the first day', () => {
    const a = award({}, 'time|2026-10-13', '2026-10-13', 10)
    const raised = award(a, 'time|2026-10-13', '2026-10-13', 15)
    expect(raised['time|2026-10-13'].xp).toBe(15)
    expect(award(raised, 'time|2026-10-13', '2026-10-13', 5)).toBe(raised)
    expect(award(raised, 'time|2026-10-13', '2026-10-14', 15)).toBe(raised)
  })

  it('merges two devices by the larger award and the earlier day', () => {
    const a = { x: { day: '2026-10-13', xp: 10 }, y: { day: '2026-10-12', xp: 5 } }
    const b = { x: { day: '2026-10-12', xp: 20 }, z: { day: '2026-10-14', xp: 1 } }
    expect(mergeLedgers(a, b)).toEqual({ x: { day: '2026-10-12', xp: 20 }, y: a.y, z: b.z })
    expect(mergeLedgers(undefined, undefined)).toEqual({})
  })

  it('keeps only well-formed awards of a loaded backup', () => {
    const good = { [lessonAwardKey('subjonctif')]: { day: '2026-10-13', xp: 20 }, [reviewAwardKey('subjonctif', 2)]: { day: '2026-10-20', xp: 10 }, [certAwardKey('fr', 'A1')]: { day: '2026-10-21', xp: CERT_XP }, [timeAwardKey('2026-10-13')]: { day: '2026-10-13', xp: 30 } }
    expect(cleanLedger({ ...good, 'weird key!': { day: '2026-10-13', xp: 5 }, 'lesson|a': { day: 'yesterday', xp: 5 }, 'lesson|b': { day: '2026-10-13', xp: 0 }, 'lesson|c': { day: '2026-10-13', xp: 99999 }, 'lesson|d': 7 })).toEqual(good)
    expect(cleanLedger(null)).toEqual({})
    expect(cleanLedger([1])).toEqual({})
  })

  it('adds the awards up per day', () => {
    const days = ledgerByDay({ a: { day: '2026-10-13', xp: 20 }, b: { day: '2026-10-13', xp: 10 }, c: { day: '2026-10-14', xp: 5 } })
    expect(days.get('2026-10-13')).toBe(30)
    expect(days.get('2026-10-14')).toBe(5)
  })
})
