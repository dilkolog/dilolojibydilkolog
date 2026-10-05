import { describe, expect, it } from 'vitest'
import { currentLevel, levelGroups, listWords, progressOf } from '../lists'
import { newWordState } from '../review'
import type { VocabularyEntry, WordList } from '../types'
import { leave } from './fixtures'

const day = (n: number) => new Date(2026, 9, n)
const word = (lemma: string, over: Partial<VocabularyEntry> = {}): VocabularyEntry => ({ ...leave, id: `en:${lemma}`, lemma, source: 'user', ...over })
const list: WordList = {
  id: 'travel',
  language: 'en',
  name: 'Seyahat',
  levels: [
    { id: 'hotel', name: 'Otel' },
    { id: 'airport', name: 'Havalimanı' },
  ],
  createdAt: '',
  updatedAt: '',
}
const words = [
  word('gate', { listId: 'travel', levelId: 'airport', addedAt: day(1) }),
  word('room', { listId: 'travel', levelId: 'hotel', addedAt: day(3) }),
  word('map', { listId: 'travel', addedAt: day(0) }),
  word('key', { listId: 'travel', levelId: 'hotel', addedAt: day(2) }),
  word('salary', { listId: 'work', addedAt: day(0) }),
]

describe('word lists with the learner’s own levels', () => {
  it('order words level by level (the learner’s order), then the ones with no level', () => {
    expect(listWords(list, words).map((w) => w.lemma)).toEqual(['key', 'room', 'gate', 'map'])
    expect(levelGroups(list, words).map((g) => [g.level?.name ?? null, g.words.map((w) => w.lemma)])).toEqual([
      ['Otel', ['key', 'room']],
      ['Havalimanı', ['gate']],
      [null, ['map']],
    ])
  })

  it('know the level in progress, and how far each is', () => {
    const groups = levelGroups(list, words)
    const met = new Map([words[3], words[1]].map((w) => [w.id, newWordState(w, day(5))]))
    expect(currentLevel(groups, met)).toEqual({ index: 1, level: { id: 'airport', name: 'Havalimanı' } })
    expect(progressOf(groups[0].words, met)).toEqual({ total: 2, met: 2, learned: 0 })
  })

  it('treat a word whose level was deleted as having none', () => {
    const groups = levelGroups({ ...list, levels: [{ id: 'hotel', name: 'Otel' }] }, words)
    expect(groups.map((g) => g.level?.name ?? null)).toEqual(['Otel', null])
    expect(groups[1].words.map((w) => w.lemma)).toEqual(['map', 'gate'])
  })
})
