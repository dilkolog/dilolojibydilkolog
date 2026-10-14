import { describe, expect, it } from 'vitest'
import { dueCount, lastStudied, listOrder } from '../lists'
import type { UserWordState, VocabularyEntry, WordList } from '../types'

const NOW = new Date('2026-10-14T09:00:00Z')
const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3_600_000)
const word = (id: string, listId?: string) => ({ id, language: 'fr', lemma: id, listId, addedAt: new Date('2026-10-01') }) as unknown as VocabularyEntry
const state = (id: string, dues: Date[], lastReviewAt?: Date) =>
  ({ entryId: id, language: 'fr', skills: Object.fromEntries(dues.map((due, i) => [`s${i}`, { due }])), lastReviewAt }) as unknown as UserWordState
const list = (id: string, createdAt: string): WordList => ({ id, language: 'fr', name: id, createdAt, updatedAt: createdAt })

describe('word lists', () => {
  it('counts the words with any skill due by now, and only met ones', () => {
    const words = [word('a'), word('b'), word('c'), word('d')]
    const states = new Map([
      ['a', state('a', [hoursFromNow(-1)])],
      ['b', state('b', [hoursFromNow(5), hoursFromNow(-2)])],
      ['c', state('c', [hoursFromNow(5)])],
    ])
    expect(dueCount(words, states, NOW)).toBe(2)
  })

  it('knows when a list was last studied, and never for one with no answers', () => {
    const states = new Map([['a', state('a', [], new Date('2026-10-12'))], ['b', state('b', [], new Date('2026-10-13'))]])
    expect(lastStudied([word('a'), word('b')], states)).toBe(new Date('2026-10-13').getTime())
    expect(lastStudied([word('x')], states)).toBe(0)
  })

  it('shows the list in focus first, then the ones studied lately, then the newest, and empty ones last', () => {
    const lists = [list('old', '2026-09-01'), list('new', '2026-10-10'), list('studied', '2026-08-01'), list('focus', '2026-07-01'), list('empty', '2026-10-12')]
    const vocabulary = [word('s', 'studied'), word('o', 'old'), word('n', 'new'), word('f', 'focus')]
    const states = new Map([['s', state('s', [], new Date('2026-10-13'))]])
    expect(listOrder(lists, vocabulary, states, 'focus').map((l) => l.id)).toEqual(['focus', 'studied', 'new', 'old', 'empty'])
    expect(listOrder(lists, vocabulary, states).map((l) => l.id)).toEqual(['studied', 'new', 'old', 'focus', 'empty'])
  })
})
