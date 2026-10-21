// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyPrefs, cleanPrefs, collectPrefs, isPrefKey, mergePrefs } from './devicePrefs'
import { exportBackup, KelimeDB, parseBackup, restoreBackup } from './db'

let db: KelimeDB
let n = 0
beforeEach(() => {
  localStorage.clear()
  db = new KelimeDB(`t-prefs-${++n}`)
})

describe('device prefs', () => {
  it('knows which keys travel: choices and seen-markers, never sign-in tokens, waiting links or caches', () => {
    for (const key of ['kelime-koc:theme', 'kelime-koc:badges-seen', 'diloloji:friend-nicknames', 'diloloji:monki:fr', 'meta:writingErrors', 'meta:pronScores']) expect(isPrefKey(key), key).toBe(true)
    for (const key of ['diloloji-auth', 'diloloji:invite-in', 'diloloji:pending-handle', 'diloloji:duel-in', 'diloloji:audio-pos:text-1', 'kelime-koc:dict-sentences:fr:maison', 'diloloji:pixabay-key', 'meta:aiKey', 'meta:notices']) expect(isPrefKey(key), key).toBe(false)
  })

  it('collects the values with the moment each changed, and keeps that moment while the value stays', async () => {
    localStorage.setItem('kelime-koc:theme', 'dark')
    localStorage.setItem('diloloji-auth', 'secret')
    await db.meta.put({ key: 'writingErrors', value: { a: 1 } })
    const first = await collectPrefs(db, new Date('2026-10-21T10:00:00Z'))
    expect(Object.keys(first).sort()).toEqual(['kelime-koc:theme', 'meta:writingErrors'])
    expect(first['kelime-koc:theme']).toEqual({ v: 'dark', at: '2026-10-21T10:00:00.000Z' })
    const same = await collectPrefs(db, new Date('2026-10-21T12:00:00Z'))
    expect(same['kelime-koc:theme']!.at).toBe('2026-10-21T10:00:00.000Z')
    localStorage.setItem('kelime-koc:theme', 'light')
    const changed = await collectPrefs(db, new Date('2026-10-21T13:00:00Z'))
    expect(changed['kelime-koc:theme']).toEqual({ v: 'light', at: '2026-10-21T13:00:00.000Z' })
  })

  it('the later value wins a merge', () => {
    const a = { k: { v: 'x', at: '2026-10-21T10:00:00.000Z' } }
    const b = { 'kelime-koc:theme': { v: 'dark', at: '2026-10-21T09:00:00.000Z' } }
    const phone = { 'kelime-koc:theme': { v: 'light', at: '2026-10-21T11:00:00.000Z' } }
    expect(mergePrefs(phone, b)['kelime-koc:theme']!.v).toBe('light')
    expect(mergePrefs(b, phone)['kelime-koc:theme']!.v).toBe('light')
    expect(mergePrefs(a, undefined)).toEqual(a)
  })

  it('drops what a damaged backup cannot be trusted with', () => {
    expect(cleanPrefs('x')).toBeUndefined()
    const clean = cleanPrefs({ 'kelime-koc:theme': { v: 'dark', at: '2026-10-21T10:00:00.000Z' }, 'diloloji-auth': { v: 'x', at: '2026-10-21T10:00:00.000Z' }, 'kelime-koc:density': { v: 5, at: 'now' } })
    expect(Object.keys(clean!)).toEqual(['kelime-koc:theme'])
  })

  it('applies the values to this device, in storage and in rows', async () => {
    localStorage.setItem('kelime-koc:theme', 'light')
    await applyPrefs(db, {
      'kelime-koc:theme': { v: 'dark', at: '2026-10-21T10:00:00.000Z' },
      'meta:pronScores': { v: JSON.stringify({ maison: [80] }), at: '2026-10-21T10:00:00.000Z' },
    })
    expect(localStorage.getItem('kelime-koc:theme')).toBe('dark')
    expect((await db.meta.get('pronScores'))?.value).toEqual({ maison: [80] })
  })

  it('travels in a backup: a signed-out device that is emptied gets its choices back from the account', async () => {
    localStorage.setItem('kelime-koc:badges-seen', '["streak-7"]')
    await db.meta.put({ key: 'writingErrors', value: { agreement: 3 } })
    const json = await exportBackup(db, new Date('2026-10-21T10:00:00Z'))
    expect(parseBackup(json).prefs!['kelime-koc:badges-seen']!.v).toBe('["streak-7"]')
    localStorage.clear()
    const fresh = new KelimeDB(`t-prefs-fresh-${n}`)
    await restoreBackup(fresh, parseBackup(json), { keepMedia: true })
    expect(localStorage.getItem('kelime-koc:badges-seen')).toBe('["streak-7"]')
    expect((await fresh.meta.get('writingErrors'))?.value).toEqual({ agreement: 3 })
  })
})
