import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { KelimeDB } from './db'

const base = { language: 'fr' as const, text: 'Le chat dort.', history: [] }

describe('reading library', () => {
  it('opens with a text whose date was stored as a Date, and puts the date right', async () => {
    const db = new KelimeDB(`lib-${Math.random()}`)
    await db.texts.bulkPut([
      { ...base, id: 'old', title: 'Old', addedAt: new Date('2026-10-01T10:00:00Z') },
      { ...base, id: 'new', title: 'New', addedAt: '2026-10-05T10:00:00.000Z' },
      { ...base, id: 'odd', title: 'Odd', addedAt: {} },
    ] as never)
    const lib = await db.getLibrary('fr')
    expect(lib.map((t) => t.id)).toEqual(['new', 'old', 'odd'])
    expect(lib.every((t) => typeof t.addedAt === 'string')).toBe(true)
    const stored = await db.texts.toArray()
    expect(stored.every((t) => typeof t.addedAt === 'string')).toBe(true)
  })

  it('moves the old single-row library into one row a text when the database is upgraded', async () => {
    const name = `lib-upgrade-${Math.random()}`
    // The database as it was before: the whole library in one meta row.
    const old = new Dexie(name)
    old.version(1).stores({ vocabulary: 'id, language, source', wordStates: 'entryId, language', events: 'id, entryId, language, timestamp', mistakes: 'id, entryId', meta: 'key' })
    old.version(2).stores({ media: 'id, kind' })
    old.version(3).stores({ stories: 'id, language, createdAt' })
    await old.table('meta').put({
      key: 'library',
      value: [
        { ...base, id: 'a', title: 'A', addedAt: '2026-10-01T10:00:00.000Z' },
        { ...base, id: 'b', title: 'B', addedAt: new Date('2026-10-02T10:00:00Z'), book: { id: 'bk', title: 'Book', index: 0, total: 1 } },
      ],
    })
    old.close()

    const db = new KelimeDB(name)
    expect((await db.getLibrary('fr')).map((t) => t.id)).toEqual(['b', 'a'])
    expect(await db.meta.get('library')).toBeUndefined()
    await db.deleteBook('bk')
    expect((await db.getLibrary('fr')).map((t) => t.id)).toEqual(['a'])
  })

  it('saving one text leaves the others alone, and deleting one leaves a mark for the sync', async () => {
    const db = new KelimeDB(`lib-save-${Math.random()}`)
    await db.saveTexts([
      { ...base, id: 'a', title: 'A', addedAt: '2026-10-01T10:00:00.000Z' },
      { ...base, id: 'b', title: 'B', addedAt: '2026-10-02T10:00:00.000Z' },
    ])
    await db.saveText({ ...base, id: 'a', title: 'A!', addedAt: '2026-10-01T10:00:00.000Z', history: [{ at: '2026-10-03T00:00:00.000Z', coverage: 0.5 }] })
    expect((await db.getLibrary('fr')).map((t) => [t.id, t.title])).toEqual([['b', 'B'], ['a', 'A!']])
    const gone = (await db.getLibrary('fr'))[0]
    await db.deleteText('b')
    expect((await db.getLibrary('fr')).map((t) => t.id)).toEqual(['a'])
    expect(JSON.stringify((await db.meta.get('deleted'))?.value)).toContain('"b"')
    await db.restoreTexts([gone])
    expect((await db.getLibrary('fr')).map((t) => t.id)).toEqual(['b', 'a'])
  })
})
