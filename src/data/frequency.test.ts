import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { KelimeDB } from './db'
import { fillFrequencyRanks, loadFrequency, NOT_LISTED, parseFrequencyList, rankOf, UNRANKED } from './frequency'
import { bandOf, createEntry } from './wordInput'

const NOW = new Date('2026-10-01T10:00:00Z')

describe('frequency lists', () => {
  it('parses one word per line, line number = rank', () => {
    expect([...parseFrequencyList('the\nof\nthe\n\nand\n')]).toEqual([
      ['the', 1],
      ['of', 2],
      ['and', 5],
    ])
  })

  it('ships 20 000 words per language', async () => {
    for (const l of ['en', 'fr', 'es'] as const) expect((await loadFrequency(l)).size).toBeGreaterThan(19_000)
  })

  it('ranks real words sensibly, verbs by their most frequent present form', async () => {
    const fr = await loadFrequency('fr')
    const word = (w: string, pos?: 'verb') => createEntry({ word: w, meaning: 'x', partOfSpeech: pos }, 'fr', NOW)
    expect(bandOf(rankOf(word('la maison'), fr))?.id).toBe('top1000')
    expect(rankOf(word('être', 'verb'), fr)).toBeLessThan(10)
    expect(rankOf(word('xyzzyq'), fr)).toBe(NOT_LISTED)
    expect(rankOf(word('prendre une décision'), fr)).toBe(UNRANKED)
    expect(bandOf(NOT_LISTED)?.id).toBe('rare')
    expect(bandOf(UNRANKED)).toBeUndefined()
  })

  it('fills in only the user words that have no frequency yet', async () => {
    const db = new KelimeDB('t-frequency')
    const manual = { ...createEntry({ word: 'house', meaning: 'ev' }, 'en', NOW), frequencyRank: 20000 }
    const auto = createEntry({ word: 'house', meaning: 'ev' }, 'en', NOW)
    await db.vocabulary.bulkPut([manual, { ...auto, id: 'en:house2' }, { ...createEntry({ word: 'water', meaning: 'su' }, 'en', NOW), source: 'sample' as const }])
    expect(await fillFrequencyRanks(db, 'en')).toBe(1)
    expect((await db.vocabulary.get('en:house'))?.frequencyRank).toBe(20000)
    expect(bandOf((await db.vocabulary.get('en:house2'))?.frequencyRank)?.id).toBe('top1000')
    expect((await db.vocabulary.get('en:water'))?.frequencyRank).toBe(0)
    expect(await fillFrequencyRanks(db, 'en')).toBe(0)
  })
})
