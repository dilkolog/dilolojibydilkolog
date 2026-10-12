import { describe, expect, it } from 'vitest'
import { buildExam, estimateLevel, scoreExam, weakestLevel } from '../exam'
import { newWordState, processAttempt } from '../review'
import { createRng } from '../rng'
import { createScheduler } from '../scheduler'
import { CATALOG, decide, decision } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const T0 = new Date('2026-09-01T10:00:00')
const learned = (e: typeof decision, at: Date) =>
  processAttempt(newWordState(e, at), { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 2000, hintsUsed: 0, maxHints: 0, at }, [], scheduler).state

describe('retention exam', () => {
  it('tests only words met at least a few days ago, with a prediction for each', () => {
    const now = new Date('2026-10-01T10:00:00')
    const items = buildExam(CATALOG, [learned(decision, T0), learned(decide, new Date(now.getTime() - 86_400_000))], scheduler, now, createRng(1))
    expect(items.map((i) => i.entryId)).toEqual(['en:decision'])
    expect(items[0].type).toBe('mc_meaning')
    expect(items[0].predicted).toBeGreaterThan(0)
    expect(items[0].predicted).toBeLessThan(1)
  })

  it('scores recall and recognition separately against the prediction', () => {
    const items = [
      { entryId: 'a', type: 'typed_translation' as const, predicted: 0.9 },
      { entryId: 'b', type: 'mc_meaning' as const, predicted: 0.7 },
    ]
    const r = scoreExam('en', items, [true, false], new Date('2026-10-01'))
    expect(r).toMatchObject({ n: 2, recall: { n: 1, right: 1 }, recognition: { n: 1, right: 0 }, actual: 0.5 })
    expect(r.predicted).toBeCloseTo(0.8)
  })
})

describe('exam level breakdown', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((entryId) => ({ entryId, type: 'mc_meaning' as const, predicted: 0.8 }))
  const level = { a: 'A1', b: 'A1', c: 'B1', d: 'B1', e: 'B2', f: 'B2', g: 'B2' } as const

  it('groups answers by CEFR band and lists missed words', () => {
    const r = scoreExam('fr', items, [true, true, true, true, false, false, true], new Date('2026-10-01'), (id) => level[id as keyof typeof level])
    expect(r.levels).toEqual([
      { level: 'A1', n: 2, right: 2 },
      { level: 'B1', n: 2, right: 2 },
      { level: 'B2', n: 3, right: 1 },
    ])
    expect(r.missed).toEqual(['e', 'f'])
    expect(estimateLevel(r.levels)).toBe('B1')
    expect(weakestLevel(r.levels)).toBe('B2')
  })

  it('leaves the breakdown out without a level list and stays quiet on a tiny sample', () => {
    const r = scoreExam('en', items, items.map(() => true), new Date('2026-10-01'))
    expect(r.levels).toBeUndefined()
    expect(r.missed).toBeUndefined()
    expect(estimateLevel(undefined)).toBeUndefined()
    expect(estimateLevel([{ level: 'A1', n: 3, right: 3 }])).toBeUndefined()
  })
})
