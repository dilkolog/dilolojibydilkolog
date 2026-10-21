// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('a key removed on one device is removed on the others, and the removal is forgotten after 90 days', async () => {
    localStorage.setItem('diloloji:podcast:fr', '{"lines":[]}')
    await db.meta.put({ key: 'writingErrors', value: { a: 1 } })
    await collectPrefs(db, new Date('2026-10-21T10:00:00Z'))
    localStorage.removeItem('diloloji:podcast:fr')
    await db.meta.delete('writingErrors')
    const after = await collectPrefs(db, new Date('2026-10-21T11:00:00Z'))
    expect(after['diloloji:podcast:fr']).toEqual({ v: '', at: '2026-10-21T11:00:00.000Z' })
    expect(after['meta:writingErrors']).toEqual({ v: '', at: '2026-10-21T11:00:00.000Z' })

    // The other device still has both, set earlier: the removal is later, so it wins and removes them there.
    const other = new KelimeDB(`t-prefs-other-${n}`)
    await other.meta.put({ key: 'writingErrors', value: { a: 1 } })
    const merged = mergePrefs({ 'diloloji:podcast:fr': { v: '{"lines":[]}', at: '2026-10-21T10:00:00.000Z' } }, after)
    localStorage.setItem('diloloji:podcast:fr', '{"lines":[]}')
    await applyPrefs(other, merged)
    expect(localStorage.getItem('diloloji:podcast:fr')).toBeNull()
    expect(await other.meta.get('writingErrors')).toBeUndefined()

    // A value set again later wins over the removal.
    expect(mergePrefs(after, { 'diloloji:podcast:fr': { v: 'new', at: '2026-10-22T09:00:00.000Z' } })['diloloji:podcast:fr']!.v).toBe('new')

    const later = await collectPrefs(db, new Date('2027-02-01T10:00:00Z'))
    expect(later['diloloji:podcast:fr']).toBeUndefined()
  })

  it('a value this device could not take is not later sent out as a removal', async () => {
    const items = new Map<string, string>()
    const full = {
      getItem: (k: string) => items.get(k) ?? null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: (k: string) => void items.delete(k),
    }
    vi.stubGlobal('localStorage', new Proxy(full, { ownKeys: () => [...items.keys()], getOwnPropertyDescriptor: () => undefined }))
    try {
      await applyPrefs(db, { 'kelime-koc:theme': { v: 'dark', at: '2026-10-21T10:00:00.000Z' } })
      expect(items.has('kelime-koc:theme')).toBe(false)
      const next = await collectPrefs(db, new Date('2026-10-21T11:00:00Z'))
      expect(next['kelime-koc:theme']).toBeUndefined()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
