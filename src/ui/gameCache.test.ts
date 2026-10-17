// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/instance'
import { loadGame } from './game'

describe('loadGame cache', () => {
  beforeEach(async () => {
    await db.events.clear()
  })

  it('answers the same until something is written, then reads again', async () => {
    const now = new Date('2026-10-12T10:00:00')
    const a = loadGame(db, now)
    expect(loadGame(db, now)).toBe(a)
    await a
    await db.meta.put({ key: 'journal', value: [] })
    const b = loadGame(db, now)
    expect(b).not.toBe(a)
    await b
    // Bookkeeping that is not part of a backup does not invalidate it.
    await db.meta.put({ key: 'syncSize', value: 1 })
    expect(loadGame(db, now)).toBe(b)
  })

  it('counts the XP earned in the verb lab, today and in total', async () => {
    const now = new Date(2026, 9, 12, 10)
    await db.events.clear()
    const before = await loadGame(db, now)
    await db.saveLab('fr', { favorites: [], recent: [], records: {}, xp: { '2026-10-12': 17, '2026-10-01': 8 } })
    const after = await loadGame(db, now)
    expect(after.xp.total - before.xp.total).toBe(25)
    expect(after.xp.today - before.xp.today).toBe(17)
    await db.saveLab('fr', { favorites: [], recent: [], records: {} })
  })

  it('counts the XP awards of the ledger (reading time, guide lessons), today and in total', async () => {
    const now = new Date(2026, 9, 12, 10)
    const before = await loadGame(db, now)
    await db.awardXp([
      { key: 'lesson|subjonctif', day: '2026-10-12', xp: 20 },
      { key: 'time|2026-10-01', day: '2026-10-01', xp: 30 },
    ])
    const after = await loadGame(db, now)
    expect(after.xp.total - before.xp.total).toBe(50)
    expect(after.xp.today - before.xp.today).toBe(20)
    await db.meta.delete('xpLedger')
  })

  it('asks again on another day', async () => {
    const a = loadGame(db, new Date('2026-10-12T10:00:00'))
    await a
    expect(loadGame(db, new Date('2026-10-13T10:00:00'))).not.toBe(a)
  })
})
