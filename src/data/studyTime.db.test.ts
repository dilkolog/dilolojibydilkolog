import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { exportBackup, KelimeDB, parseBackup, restoreBackup } from './db'
import { mergeBackups } from './sync'

const NOW = new Date(2026, 9, 13, 10, 0, 0)

describe('reading and listening time on the device', () => {
  it('adds up per language, kind and day; parallel reports are all kept', async () => {
    const db = new KelimeDB('t-time-1')
    await Promise.all([db.addStudyTime('read', 'fr', 20, NOW), db.addStudyTime('read', 'fr', 25, NOW), db.addStudyTime('listen', 'fr', 40, NOW), db.addStudyTime('read', 'es', 5, NOW)])
    expect(await db.getTimeLog()).toEqual({ 'read|fr|2026-10-13': 45, 'listen|fr|2026-10-13': 40, 'read|es|2026-10-13': 5 })
    await db.addStudyTime('read', 'fr', -4, NOW)
    expect((await db.getTimeLog())['read|fr|2026-10-13']).toBe(45)
  })

  it('travels in the backup, survives a restore, and merges by the larger number per day', async () => {
    const a = new KelimeDB('t-time-a')
    const b = new KelimeDB('t-time-b')
    await a.addStudyTime('read', 'fr', 100, NOW)
    await b.addStudyTime('read', 'fr', 60, NOW)
    await b.addStudyTime('listen', 'fr', 30, NOW)
    const snap = async (db: KelimeDB) => parseBackup(await exportBackup(db, NOW, { media: false }))
    const merged = mergeBackups(await snap(a), await snap(b))
    expect(merged.timeLog).toEqual({ 'read|fr|2026-10-13': 100, 'listen|fr|2026-10-13': 30 })
    const c = new KelimeDB('t-time-c')
    await restoreBackup(c, merged)
    expect(await c.getTimeLog()).toEqual({ 'read|fr|2026-10-13': 100, 'listen|fr|2026-10-13': 30 })
  })

  it('an old backup without the field restores to an empty log', async () => {
    const old = new KelimeDB('t-time-old')
    const file = parseBackup(await exportBackup(old, NOW, { media: false }))
    delete file.timeLog
    const fresh = new KelimeDB('t-time-fresh')
    await restoreBackup(fresh, file)
    expect(await fresh.getTimeLog()).toEqual({})
  })
})

describe('XP for reading and listening time', () => {
  it('awards 5 XP per five minutes, capped at 30 a day, once per day however it is reported', async () => {
    const db = new KelimeDB('t-timexp-1')
    await db.addStudyTime('read', 'fr', 240, NOW)
    expect(await db.getXpLedger()).toEqual({})
    await db.addStudyTime('listen', 'es', 120, NOW)
    expect((await db.getXpLedger())['time|2026-10-13']).toMatchObject({ day: '2026-10-13', xp: 5 })
    // One report counts for at most ten minutes (20 s groups in practice), so an hour takes several.
    for (let i = 0; i < 6; i++) await db.addStudyTime('read', 'fr', 600, NOW)
    expect((await db.getXpLedger())['time|2026-10-13'].xp).toBe(30)
  })

  it('survives the time log being pruned, travels in the backup and merges', async () => {
    const a = new KelimeDB('t-timexp-a')
    const b = new KelimeDB('t-timexp-b')
    await a.addStudyTime('read', 'fr', 600, NOW)
    await b.addStudyTime('read', 'fr', 600, NOW)
    await b.addStudyTime('read', 'fr', 600, NOW)
    await b.addStudyTime('read', 'fr', 300, NOW)
    await b.awardXp([{ key: 'lesson|subjonctif', day: '2026-10-12', xp: 20 }])
    const snap = async (db: KelimeDB) => parseBackup(await exportBackup(db, NOW, { media: false }))
    const merged = mergeBackups(await snap(a), await snap(b))
    expect(merged.xpLedger).toEqual({ 'time|2026-10-13': { day: '2026-10-13', xp: 25 }, 'lesson|subjonctif': { day: '2026-10-12', xp: 20 } })
    const c = new KelimeDB('t-timexp-c')
    await restoreBackup(c, merged)
    expect(await c.getXpLedger()).toEqual(merged.xpLedger)
  })

  it('answers whether an award changed anything', async () => {
    const db = new KelimeDB('t-timexp-2')
    expect(await db.awardXp([{ key: 'lesson|x', day: '2026-10-13', xp: 20 }])).toBe(true)
    expect(await db.awardXp([{ key: 'lesson|x', day: '2026-10-14', xp: 20 }])).toBe(false)
  })
})
