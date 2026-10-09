import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { KelimeDB } from './db'

describe('reading library', () => {
  it('opens with a text whose date was stored as a Date, and puts the date right', async () => {
    const db = new KelimeDB(`lib-${Math.random()}`)
    const base = { language: 'fr' as const, text: 'Le chat dort.', history: [] }
    await db.meta.put({
      key: 'library',
      value: [
        { ...base, id: 'old', title: 'Old', addedAt: new Date('2026-10-01T10:00:00Z') },
        { ...base, id: 'new', title: 'New', addedAt: '2026-10-05T10:00:00.000Z' },
        { ...base, id: 'odd', title: 'Odd', addedAt: {} },
      ],
    })
    const lib = await db.getLibrary('fr')
    expect(lib.map((t) => t.id)).toEqual(['new', 'old', 'odd'])
    expect(lib.every((t) => typeof t.addedAt === 'string')).toBe(true)
    const stored = (await db.meta.get('library'))!.value as { addedAt: unknown }[]
    expect(stored.every((t) => typeof t.addedAt === 'string')).toBe(true)
  })
})
