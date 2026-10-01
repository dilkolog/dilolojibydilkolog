import { describe, expect, it } from 'vitest'
import type { PlanItem } from '../dailyPlan'
import { newWordState } from '../review'
import { createRng } from '../rng'
import { completeItem, currentItem, isFinished, retryItem, RETRY_GAP, skipRemaining, startSession, summarize } from '../session'
import { decision } from './fixtures'

const item = (entryId: string, exerciseType: PlanItem['exerciseType'] = 'mc_meaning'): PlanItem => ({
  kind: 'exercise',
  entryId,
  reason: 'due',
  skill: 'recognition',
  exerciseType,
})

describe('session', () => {
  const items = ['a', 'b', 'c', 'd', 'e'].map((id) => item(id))

  it('walks through items in order', () => {
    let s = startSession(items)
    expect(currentItem(s)?.entryId).toBe('a')
    for (let i = 0; i < 5; i++) s = completeItem(s, { entryId: currentItem(s)!.entryId, verdict: 'correct' })
    expect(isFinished(s)).toBe(true)
  })

  it('re-queues a missed word a few items later, only once', () => {
    let s = startSession(items)
    s = completeItem(s, { entryId: 'a', verdict: 'wrong' }, item('a', 'listen_choose'))
    expect(s.items[RETRY_GAP + 1]).toMatchObject({ entryId: 'a', exerciseType: 'listen_choose' })
    expect(s.items).toHaveLength(6)
    while (currentItem(s)?.entryId !== 'a') s = completeItem(s, { entryId: currentItem(s)!.entryId, verdict: 'correct' })
    s = completeItem(s, { entryId: 'a', verdict: 'wrong' }, item('a'))
    expect(s.items).toHaveLength(6)
  })

  it('retries in a different format', () => {
    const state = { ...newWordState(decision, new Date()), lastExerciseType: 'mc_meaning' as const }
    const r = retryItem(item('en:decision'), decision, state, createRng(1))
    expect(r.exerciseType).not.toBe('mc_meaning')
    expect(r.skill).toBe('recognition')
  })

  it('summarises strengthened words, struggles and error types', () => {
    let s = startSession([item('a'), item('b'), { ...item('c'), kind: 'introduce' }])
    s = completeItem(s, { entryId: 'a', verdict: 'correct', stageBefore: 'introduced', stageAfter: 'familiar' })
    s = completeItem(s, { entryId: 'b', verdict: 'wrong', errorType: 'gender', stageBefore: 'familiar', stageAfter: 'familiar' })
    s = completeItem(s, { entryId: 'c' })
    expect(summarize(s)).toEqual({
      answered: 2,
      correct: 1,
      strengthened: ['a'],
      struggling: ['b'],
      errors: { gender: 1 },
      introduced: ['c'],
    })
  })
})

describe('skipRemaining', () => {
  it('removes only the upcoming items of that word', () => {
    let s = startSession([item('a'), item('b'), item('a'), item('c')])
    s = completeItem(s, { entryId: 'a', verdict: 'correct' })
    s = skipRemaining(s, 'a')
    expect(s.items.map((i) => i.entryId)).toEqual(['a', 'b', 'c'])
    expect(currentItem(s)?.entryId).toBe('b')
  })
})
