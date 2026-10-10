import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackupVersionError, exportBackup, KelimeDB, parseBackup, type Backup } from './db'
import { mergeBackups, mergeWordState } from './sync'

const snapshot = async (db: KelimeDB, at: string) => {
  vi.setSystemTime(new Date(at))
  return parseBackup(await exportBackup(db, new Date(at), { media: false }))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-01T09:00:00Z'))
})
afterEach(() => vi.useRealTimers())

const state = (over: Record<string, unknown>) =>
  ({ entryId: 'fr:chat', language: 'fr', introducedAt: new Date('2026-10-02T00:00:00Z'), skills: {}, stats: { reviews: 0, correct: 0, wrong: 0, hints: 0, totalResponseMs: 0, consecutiveWrong: 0 }, ...over }) as unknown as Backup['wordStates'][number]
const card = (last: string) => ({ last_review: new Date(last) }) as never

describe('word state merge', () => {
  it('keeps the newer state, the other side\'s skills, the larger counters and the earlier introduction', () => {
    const phone = state({ lastReviewAt: new Date('2026-10-05T00:00:00Z'), skills: { recognition: card('2026-10-05T00:00:00Z') }, stats: { reviews: 5, correct: 4, wrong: 1, hints: 0, totalResponseMs: 5000, consecutiveWrong: 0 } })
    const laptop = state({
      introducedAt: new Date('2026-10-01T00:00:00Z'),
      lastReviewAt: new Date('2026-10-03T00:00:00Z'),
      skills: { recognition: card('2026-10-03T00:00:00Z'), production: card('2026-10-03T00:00:00Z') },
      stats: { reviews: 7, correct: 3, wrong: 4, hints: 2, totalResponseMs: 3000, consecutiveWrong: 2 },
    })
    const m = mergeWordState(laptop, phone)
    expect(m.lastReviewAt).toEqual(new Date('2026-10-05T00:00:00Z'))
    expect(m.skills.recognition).toBe(phone.skills.recognition)
    expect(m.skills.production).toBe(laptop.skills.production)
    expect(m.stats).toEqual({ reviews: 7, correct: 4, wrong: 4, hints: 2, totalResponseMs: 5000, consecutiveWrong: 0 })
    expect(m.introducedAt).toEqual(new Date('2026-10-01T00:00:00Z'))
    expect(mergeWordState(phone, laptop)).toEqual(m)
  })
})

describe('settings merge', () => {
  it('stamps only the fields that changed and takes each field from the device that changed it last', async () => {
    const phone = new KelimeDB('t-rules-phone')
    const laptop = new KelimeDB('t-rules-laptop')
    const s = (await phone.getSettings()) ?? undefined
    vi.setSystemTime(new Date('2026-10-02T09:00:00Z'))
    const base = (await laptop.getSettings()) ?? ({ ...(s ?? {}) } as never)
    await laptop.saveSettings({ ...base, theme: 'dark' } as never)
    vi.setSystemTime(new Date('2026-10-03T09:00:00Z'))
    await phone.saveSettings({ ...base, dailyNew: 7 } as never)
    expect(Object.keys(await phone.getSettingsAt())).toEqual(['dailyNew'])
    // Different fields: the laptop's theme change survives although the phone's snapshot is the newer one.
    const a = await snapshot(laptop, '2026-10-04T09:00:00Z')
    const b = await snapshot(phone, '2026-10-04T10:00:00Z')
    const m = mergeBackups(a, b)
    expect(m.settings).toMatchObject({ theme: 'dark', dailyNew: 7 })
    expect(Object.keys(m.settingsAt ?? {}).sort()).toEqual(['dailyNew', 'theme'])
  })

  it('a newer change to the same field wins whichever snapshot is newer', async () => {
    const a = new KelimeDB('t-rules-a')
    const b = new KelimeDB('t-rules-b')
    const base = (await a.getSettings()) as never
    vi.setSystemTime(new Date('2026-10-02T09:00:00Z'))
    await b.saveSettings({ ...(base as object), theme: 'dark' } as never)
    vi.setSystemTime(new Date('2026-10-03T09:00:00Z'))
    await a.saveSettings({ ...(base as object), theme: 'sepia' } as never)
    const sa = await snapshot(a, '2026-10-03T10:00:00Z')
    const sb = await snapshot(b, '2026-10-05T10:00:00Z') // exported later, but changed earlier
    expect(mergeBackups(sa, sb).settings).toMatchObject({ theme: 'sepia' })
  })
})

describe('removals travel', () => {
  it('a known word taken out on one device is out on the other, and one put back stays', async () => {
    const phone = new KelimeDB('t-rm-phone')
    const laptop = new KelimeDB('t-rm-laptop')
    await phone.addKnownWords('fr', ['chat', 'chien'])
    await laptop.addKnownWords('fr', ['chat', 'chien'])
    vi.setSystemTime(new Date('2026-10-02T09:00:00Z'))
    await phone.removeKnownWord('fr', 'chat')
    const merged = mergeBackups(await snapshot(laptop, '2026-10-03T09:00:00Z'), await snapshot(phone, '2026-10-03T09:00:01Z'))
    expect(merged.reading?.known.fr).toEqual(['chien'])
    // Put back on the phone later: it is known again everywhere.
    vi.setSystemTime(new Date('2026-10-04T09:00:00Z'))
    await phone.addKnownWords('fr', ['chat'])
    const again = mergeBackups(merged, await snapshot(phone, '2026-10-04T09:00:01Z'))
    expect([...(again.reading?.known.fr ?? [])].sort()).toEqual(['chat', 'chien'])
  })

  it('un-ignoring, a favourite taken out and a dictionary correction taken back all stay gone', async () => {
    const phone = new KelimeDB('t-rm2-phone')
    const laptop = new KelimeDB('t-rm2-laptop')
    for (const d of [phone, laptop]) {
      await d.setIgnored('fr', 'paris', true)
      await d.saveLab('fr', { favorites: ['parler'], recent: [], records: {} })
      await d.saveDictionaryNotes('fr', { fixes: { maison: { t: ['ev'], at: '2026-10-01T09:00:00.000Z' } }, looked: {} })
    }
    vi.setSystemTime(new Date('2026-10-02T09:00:00Z'))
    await phone.setIgnored('fr', 'paris', false)
    await phone.saveLab('fr', { favorites: [], recent: [], records: {} })
    await phone.saveDictionaryNotes('fr', { fixes: {}, looked: {} })
    const merged = mergeBackups(await snapshot(laptop, '2026-10-03T09:00:00Z'), await snapshot(phone, '2026-10-03T09:00:01Z'))
    expect(merged.reading?.ignored?.fr).toEqual([])
    expect(merged.lab?.fr?.favorites).toEqual([])
    expect(merged.dictionary?.fr?.fixes).toEqual({})
    // A correction written again after it was taken back lives.
    vi.setSystemTime(new Date('2026-10-04T09:00:00Z'))
    await phone.saveDictionaryNotes('fr', { fixes: { maison: { t: ['konut'], at: '2026-10-04T09:00:00.000Z' } }, looked: {} })
    expect(mergeBackups(merged, await snapshot(phone, '2026-10-04T09:00:01Z')).dictionary?.fr?.fixes.maison.t).toEqual(['konut'])
  })
})

describe('backup version', () => {
  it('a newer backup is a BackupVersionError, which the screens turn into "update the app"', () => {
    expect(() => parseBackup('{"app":"kelime-koc","version":99,"vocabulary":[]}')).toThrow(BackupVersionError)
  })
})
