import { describe, expect, it } from 'vitest'
import { loadFrequency } from '../../data/frequency'
import { createRng } from '../rng'
import { BANDS, buildVocabTest, PSEUDO_WORDS, scoreVocabTest, WORDS_PER_BAND } from '../vocabTest'

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
