import { describe, expect, it } from 'vitest'
import { loadFrequency } from '../../data/frequency'
import { createRng } from '../rng'
import { adviceFor, BANDS, buildVocabTest, PSEUDO_WORDS, scoreVocabTest, WORDS_PER_BAND } from '../vocabTest'

describe('vocabulary size test', () => {
  it('samples every band and adds invented words that are not in the list', async () => {
    for (const lang of ['en', 'fr', 'es'] as const) {
      const list = [...(await loadFrequency(lang)).keys()]
      const others = (['en', 'fr', 'es'] as const).filter((l) => l !== lang)
      const exclude = (await Promise.all(others.map(loadFrequency))).flatMap((m) => [...m.keys()])
      const items = buildVocabTest(list, createRng(5), exclude)
      expect(items.filter((i) => i.band !== undefined)).toHaveLength(BANDS * WORDS_PER_BAND)
      const fakes = items.filter((i) => i.band === undefined)
      expect(fakes).toHaveLength(PSEUDO_WORDS)
      const listed = new Set([...list, ...exclude])
      for (const f of fakes) expect(listed.has(f.word)).toBe(false)
    }
  })

  it('scales known shares by band and corrects for overclaiming', () => {
    const items = [
      ...Array.from({ length: BANDS }, (_, b) => [{ word: `k${b}`, band: b }, { word: `u${b}`, band: b }]).flat(),
      { word: 'fake1' },
      { word: 'fake2' },
    ]
    // Honest: knows one of two words in every band, rejects both fakes.
    const honest = scoreVocabTest(items, new Set(Array.from({ length: BANDS }, (_, b) => `k${b}`)))
    expect(honest.estimate).toBe(10_000)
    expect(honest.falseAlarms).toBe(0)
    // Same answers plus "knowing" one fake: every band is corrected down.
    const over = scoreVocabTest(items, new Set([...Array.from({ length: BANDS }, (_, b) => `k${b}`), 'fake1']))
    expect(over.falseAlarms).toBe(0.5)
    expect(over.estimate).toBe(0)
    // Skipped words (names) count neither way.
    const skipped = scoreVocabTest(items, new Set(Array.from({ length: BANDS }, (_, b) => `k${b}`)), new Set(['u0']))
    expect(skipped.bands[0]).toBe(1)
  })
})

describe('a level from the vocabulary size', () => {
  it('reads a size as a CEFR stage, with advice and a suitable number of new words a day', () => {
    expect(adviceFor(300)).toMatchObject({ level: 'A1', newPerDay: 10 })
    expect(adviceFor(1500).level).toBe('A2')
    expect(adviceFor(2500).level).toBe('B1')
    expect(adviceFor(5000).level).toBe('B2')
    expect(adviceFor(8000).level).toBe('C1')
    expect(adviceFor(15000).level).toBe('C2')
    // The bigger the vocabulary, the fewer new words a day make sense, and every stage says what to do.
    const sizes = [300, 1500, 2500, 5000, 8000, 15000]
    const perDay = sizes.map((n) => adviceFor(n).newPerDay)
    expect([...perDay].sort((a, b) => b - a)).toEqual(perDay)
    expect(sizes.every((n) => adviceFor(n).advice.length > 20)).toBe(true)
  })
})
