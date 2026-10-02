import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { KelimeDB } from '../data/db'
import { createEntry } from '../data/wordInput'
import { newWordState } from '../engine/review'
import { readingKey } from '../engine/reading'
import { extensionData } from './extensionBridge'

const NOW = new Date('2026-10-01T10:00:00Z')

describe('data for the browser extension', () => {
  it('lists user words by reading key with stage and meaning, plus known and ignored words', async () => {
    const db = new KelimeDB('t-extension')
    const studied = createEntry({ word: 'la décision', meaning: 'karar' }, 'fr', NOW)
    const waiting = { ...createEntry({ word: 'colour', meaning: 'renk' }, 'en', NOW), alternativeForms: ['color'] }
    const sample = { ...createEntry({ word: 'water', meaning: 'su' }, 'en', NOW), source: 'sample' as const }
    await db.vocabulary.bulkPut([studied, waiting, sample])
    await db.wordStates.put(newWordState(studied, NOW))
    await db.addKnownWords('fr', [readingKey('maison', 'fr')])
    await db.setIgnored('fr', readingKey('Macron', 'fr'), true)

    const data = await extensionData(db)
    expect(data.fr.list).toEqual([{ k: readingKey('décision', 'fr'), id: studied.id, w: 'la décision', g: 'karar', s: 0 }])
    expect(data.en.list.map((w) => w.k)).toEqual([readingKey('colour', 'en'), readingKey('color', 'en')])
    expect(data.en.list[0].s).toBe(-1)
    expect(data.fr.known).toEqual([readingKey('maison', 'fr')])
    expect(data.fr.ignored).toEqual([readingKey('Macron', 'fr')])
    expect(data.es.list).toEqual([])
  })
})
