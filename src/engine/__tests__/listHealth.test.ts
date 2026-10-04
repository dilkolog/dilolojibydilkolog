import { describe, expect, it } from 'vitest'
import { createEntry } from '../../data/wordInput'
import { newWordState } from '../review'
import { isLeech, keeperOf, listHealth, mergeEntries } from '../listHealth'
import type { VocabularyEntry } from '../types'

const NOW = new Date('2026-10-02T10:00:00Z')
const old = new Date('2026-06-01T10:00:00Z')
const entry = (word: string, meaning: string, lang: 'en' | 'fr' = 'en', at = NOW, example?: string): VocabularyEntry => ({
  ...createEntry({ word, meaning, example }, lang, at),
  id: `${lang}:${word}:${meaning}`,
  addedAt: at,
})

describe('list health', () => {
  const receive = entry('receive', 'almak', 'en', NOW, 'I *receive* letters.')
  const recieve = entry('recieve', 'almak')
  const decision1 = entry('decision', 'karar')
  const decision2 = { ...entry('décision', 'karar'), language: 'en' as const }
  const maison = { ...entry('maison', 'ev', 'fr'), partOfSpeech: 'noun' as const, gender: undefined }
  const forgotten = entry('harbour', 'liman', 'en', old)

  it('finds doubles, missing genders, missing examples and words never started', () => {
    const h = listHealth([receive, recieve, decision1, decision2, maison, forgotten], [newWordState(receive, NOW)], [], NOW)
    expect(h.duplicates.map((g) => g.map((e) => e.lemma).sort())).toEqual([['receive', 'recieve'], ['decision', 'décision']])
    expect(h.noGender.map((e) => e.lemma)).toEqual(['maison'])
    expect(h.noExample.map((e) => e.lemma)).not.toContain('receive')
    expect(h.stale.map((e) => e.lemma)).toEqual(['harbour'])
  })

  it('spots leeches', () => {
    const s = newWordState(receive, NOW)
    expect(isLeech(s)).toBe(false)
    expect(isLeech({ ...s, stats: { ...s.stats, reviews: 8, wrong: 5 } })).toBe(true)
    expect(isLeech({ ...s, stats: { ...s.stats, consecutiveWrong: 3 } })).toBe(true)
  })

  it('merges into the most practised copy, keeping everything', () => {
    const a = { ...receive, tags: ['iş'], notes: 'not A' }
    const b = { ...entry('receive', 'teslim almak', 'en', NOW, 'They *receive* guests.'), tags: ['ev'], notes: 'not B' }
    const keeper = keeperOf([b, a], [{ ...newWordState(a, NOW), stats: { ...newWordState(a, NOW).stats, reviews: 9 } }])
    expect(keeper).toBe(a)
    const m = mergeEntries(a, [b])
    expect(m.senses[0].examples.map((x) => x.text)).toEqual(['I receive letters.', 'They receive guests.'])
    expect(m.senses[0].altGlosses).toEqual(['teslim almak'])
    expect(m.tags).toEqual(['iş', 'ev'])
    expect(m.notes).toBe('not A\nnot B')
  })
})

describe('listHealth at scale', () => {
  it('checks thousands of words quickly (no comparison of every pair)', () => {
    const now = new Date()
    const words = Array.from({ length: 4000 }, (_, i) => createEntry({ word: `palabra${i}`, meaning: `anlam ${i % 50}` }, 'es', now))
    const t = performance.now()
    const h = listHealth(words, [], [], now)
    expect(performance.now() - t).toBeLessThan(2000)
    expect(h.duplicates.length).toBeGreaterThan(0)
  })
})
