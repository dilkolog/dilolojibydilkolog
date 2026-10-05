import { describe, expect, it } from 'vitest'
import { currentSection, levelOf, listWords, progressOf, sections, SECTION_SIZE } from '../lists'
import { newWordState } from '../review'
import type { VocabularyEntry } from '../types'
import { leave } from './fixtures'

const word = (lemma: string, over: Partial<VocabularyEntry> = {}): VocabularyEntry => ({ ...leave, id: `en:${lemma}`, lemma, source: 'user', ...over })

describe('levels', () => {
  it('come from frequency unless the learner set one', () => {
    expect(levelOf(word('a', { frequencyRank: 300 }))).toBe('A1')
    expect(levelOf(word('b', { frequencyRank: 1500 }))).toBe('A2')
    expect(levelOf(word('c', { frequencyRank: 3000 }))).toBe('B1')
    expect(levelOf(word('d', { frequencyRank: 4500 }))).toBe('B2')
    expect(levelOf(word('e', { frequencyRank: 7000 }))).toBe('C1')
    expect(levelOf(word('f', { frequencyRank: -1 }))).toBe('C2')
    expect(levelOf(word('g', { frequencyRank: 0 }))).toBeNull()
    expect(levelOf(word('h', { frequencyRank: 300, cefr: 'B2', levelSet: true }))).toBe('B2')
  })
})

describe('lists', () => {
  const day = (n: number) => new Date(2026, 9, n)
  const words = Array.from({ length: 20 }, (_, i) => word(`w${i}`, { listId: 'l', addedAt: day(20 - i) }))

  it('keep their words in the order added, in sections', () => {
    const ordered = listWords({ id: 'l' }, [word('other'), ...words])
    expect(ordered[0].lemma).toBe('w19')
    expect(sections(ordered).map((s) => s.length)).toEqual([SECTION_SIZE, 20 - SECTION_SIZE])
  })

  it('know the section in progress and how far it is', () => {
    const ordered = listWords({ id: 'l' }, words)
    const met = new Map(ordered.slice(0, SECTION_SIZE).map((w) => [w.id, newWordState(w, day(25))]))
    expect(currentSection(ordered, met)).toEqual({ index: 2, count: 2 })
    expect(progressOf(ordered, met)).toEqual({ total: 20, met: SECTION_SIZE, learned: 0 })
  })
})
