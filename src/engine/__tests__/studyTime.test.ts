import { describe, expect, it } from 'vitest'
import { addTime, cleanTimeLog, durationText, goalProgress, mergeTimeLogs, pruneTimeLog, timeKey, weekOf, MAX_REPORT_SECONDS } from '../studyTime'

describe('study time', () => {
  it('adds seconds under language and day, ignores nonsense, and caps one report', () => {
    let log = addTime({}, 'read', 'fr', '2026-10-13', 30)
    log = addTime(log, 'read', 'fr', '2026-10-13', 15.4)
    expect(log[timeKey('read', 'fr', '2026-10-13')]).toBe(45)
    expect(addTime(log, 'read', 'fr', '2026-10-13', -5)).toBe(log)
    expect(addTime(log, 'read', 'fr', '2026-10-13', Number.NaN)).toBe(log)
    expect(addTime({}, 'listen', 'es', '2026-10-13', 99999)[timeKey('listen', 'es', '2026-10-13')]).toBe(MAX_REPORT_SECONDS)
  })

  it('merges two devices by the larger number per day, and prunes old days', () => {
    const a = { 'read|fr|2026-10-12': 100, 'read|fr|2026-10-13': 50 }
    const b = { 'read|fr|2026-10-12': 80, 'listen|fr|2026-10-13': 20 }
    expect(mergeTimeLogs(a, b)).toEqual({ 'read|fr|2026-10-12': 100, 'read|fr|2026-10-13': 50, 'listen|fr|2026-10-13': 20 })
    expect(mergeTimeLogs(undefined, undefined)).toEqual({})
    const pruned = pruneTimeLog({ 'read|fr|2025-01-01': 5, 'read|fr|2026-10-12': 7 }, new Date(2026, 9, 13))
    expect(Object.keys(pruned)).toEqual(['read|fr|2026-10-12'])
  })

  it('keeps only well-formed entries of a loaded backup', () => {
    expect(cleanTimeLog({ 'read|fr|2026-10-13': 60.4, 'read|xx|2026-10-13': 5, 'swim|fr|2026-10-13': 5, 'read|fr|2026-10-14': -3, 'read|fr|2026-10-15': 'x' })).toEqual({ 'read|fr|2026-10-13': 60 })
    expect(cleanTimeLog(null)).toEqual({})
    expect(cleanTimeLog([1, 2])).toEqual({})
  })

  it('totals the last seven days of one language', () => {
    const log = { 'read|fr|2026-10-13': 600, 'listen|fr|2026-10-13': 300, 'read|fr|2026-10-07': 60, 'read|fr|2026-10-06': 999, 'read|es|2026-10-13': 7 }
    const week = weekOf(log, 'fr', new Date(2026, 9, 13))
    expect(week.days).toHaveLength(7)
    expect(week.days[0].day).toBe('2026-10-07')
    expect(week.days[6]).toMatchObject({ day: '2026-10-13', read: 600, listen: 300 })
    expect(week).toMatchObject({ read: 660, listen: 300, total: 960 })
  })

  it('writes durations and goal progress in plain Turkish', () => {
    expect(durationText(0)).toBe('0 dk')
    expect(durationText(45)).toBe('45 sn')
    expect(durationText(12 * 60)).toBe('12 dk')
    expect(durationText(3600)).toBe('1 sa')
    expect(durationText(3600 + 5 * 60)).toBe('1 sa 05 dk')
    expect(goalProgress(100, undefined)).toBeNull()
    expect(goalProgress(30 * 60, 60)).toEqual({ share: 0.5, done: false, leftMinutes: 30 })
    expect(goalProgress(70 * 60, 60)).toMatchObject({ share: 1, done: true, leftMinutes: 0 })
  })
})
