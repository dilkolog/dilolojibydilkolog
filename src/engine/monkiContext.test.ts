import { describe, expect, it } from 'vitest'
import { decide, decision } from './__tests__/fixtures'
import { mistakesForMonki, weakWordsOf } from './monkiContext'
import type { Mistake } from './types'

const mistake = (entryId: string, count: number, extra: Partial<Mistake> = {}): Mistake =>
  ({ id: `${entryId}|x|y`, entryId, errorType: 'spelling', exerciseType: 'typed_translation', given: 'desicion', expected: 'decision', count, firstAt: new Date(), lastAt: new Date(), correctSince: 0, resolved: false, ...extra }) as Mistake

describe('what Monki is told', () => {
  it('the weak words are the most mistaken ones first, once each', () => {
    const words = weakWordsOf([decision, decide], [mistake('en:decide', 1), mistake('en:decision', 4), mistake('en:decision', 2, { id: 'other' })])
    expect(words).toEqual(['decision', 'decide'])
  })

  it('resolved mistakes and words that are gone do not count', () => {
    expect(weakWordsOf([decision], [mistake('en:decision', 3, { resolved: true }), mistake('en:gone', 9)])).toEqual([])
    expect(mistakesForMonki([decision], [mistake('en:gone', 9)])).toEqual([])
  })

  it('the mistakes carry what was written and what was right', () => {
    expect(mistakesForMonki([decision], [mistake('en:decision', 2)])).toEqual([{ word: 'decision', given: 'desicion', expected: 'decision' }])
  })

  it('at most six', () => {
    const many = Array.from({ length: 9 }, (_, i) => mistake('en:decision', i + 1, { id: `m${i}` }))
    expect(mistakesForMonki([decision], many)).toHaveLength(6)
  })
})
