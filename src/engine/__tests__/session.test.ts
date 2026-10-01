import { describe, expect, it } from 'vitest'
import type { PlanItem } from '../dailyPlan'
import { newWordState } from '../review'
import { createRng } from '../rng'
import { completeItem, currentItem, isFinished, MAX_RETRIES, RELEARN_TARGET, retryItem, RETRY_GAP, skipRemaining, startSession, summarize } from '../session'
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

  it('re-queues a missed word a few items later', () => {
    let s = startSession(items)
    s = completeItem(s, { entryId: 'a', verdict: 'wrong' }, item('a', 'listen_choose'))
    expect(s.items[RETRY_GAP + 1]).toMatchObject({ entryId: 'a', exerciseType: 'listen_choose' })
    expect(s.items).toHaveLength(6)
  })

  /** Answers every item; 'a' gets the given verdicts in turn, others are right. */
  const run = (verdicts: ('correct' | 'wrong')[]) => {
    let s = startSession(items)
    let k = 0
    while (!isFinished(s)) {
      const id = currentItem(s)!.entryId
      const verdict = id === 'a' ? (verdicts[k++] ?? 'correct') : 'correct'
      s = completeItem(s, { entryId: id, verdict }, item(id))
    }
    return { s, aAnswers: k }
  }

  it('a missed word must be recalled correctly twice before it leaves the session', () => {
    const { aAnswers } = run(['wrong'])
    expect(aAnswers).toBe(1 + RELEARN_TARGET)
  })

  it('a correct answer never re-queues a word that was not missed', () => {
    const { s } = run([])
    expect(s.items).toHaveLength(5)
  })

  it('a wrong retry resets the target, but re-queues are capped', () => {
    expect(run(['wrong', 'wrong']).aAnswers).toBe(2 + RELEARN_TARGET)
    expect(run(['wrong', 'wrong', 'wrong', 'wrong', 'wrong']).aAnswers).toBe(1 + MAX_RETRIES)
  })

  it('retries in a different format', () => {
    const state = { ...newWordState(decision, new Date()), lastExerciseType: 'mc_meaning' as const }
    const r = retryItem(item('en:decision'), decision, state, createRng(1))
    expect(r.exerciseType).not.toBe('mc_meaning')
    expect(r.skill).toBe('recognition')
  })

  it('summarises strengthened words, struggles and error types', () => {
    let s = startSession([item('a'), item('b'), { ...item('c'), kind: 'introduce' }])
    s = completeItem(s, { entryId: 'a', verdict: 'correct', stageBefore: 'introduced', stageAfter: 'familiar', xp: 5 })
    s = completeItem(s, { entryId: 'b', verdict: 'wrong', errorType: 'gender', stageBefore: 'familiar', stageAfter: 'familiar' })
    s = completeItem(s, { entryId: 'c' })
    expect(summarize(s)).toEqual({
      answered: 2,
      correct: 1,
      strengthened: ['a'],
      struggling: ['b'],
      errors: { gender: 1 },
      introduced: ['c'],
      xp: 5,
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
