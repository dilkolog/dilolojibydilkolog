import { describe, expect, it } from 'vitest'
import type { PlanItem } from '../dailyPlan'
import { buildExtraNewPlan } from '../dailyPlan'
import { adaptExercise, attemptMode, completeItem, currentItem, isFinished, LEARNING_BATCH_SIZE, retryItem, sessionProgress, startSession, typedFollowUp } from '../session'
import { newWordState, processAttempt } from '../review'
import { createScheduler } from '../scheduler'
import { createRng } from '../rng'
import { buildExercise, evaluateTyped } from '../exercises'
import { createEntry } from '../../data/wordInput'
import { decision } from './fixtures'

const intro = (id: string): PlanItem => ({ entryId: id, kind: 'introduce', reason: 'new', skill: 'recognition' })
const test = (id: string): PlanItem => ({ ...intro(id), kind: 'exercise', exerciseType: 'mc_meaning' })

describe('guided learning flow', () => {
  it('finishes all repetitions in a three-word group before introducing the next group', () => {
    const ids = Array.from({ length: 8 }, (_, i) => `word-${i}`)
    let s = startSession([...ids.map(intro), ...ids.map(test)])
    let answers = 0
    let progress = 0
    while (!isFinished(s)) {
      const it = currentItem(s)!
      if (it.kind === 'introduce') {
        const earlier = ids.slice(0, Math.floor(ids.indexOf(it.entryId) / LEARNING_BATCH_SIZE) * LEARNING_BATCH_SIZE)
        for (const id of earlier) {
          expect(s.log.filter((l) => l.entryId === id && l.verdict)).toHaveLength(3)
          expect(s.log.some((l) => l.entryId === id && l.item.exerciseType === 'typed_translation')).toBe(true)
        }
        s = completeItem(s, { entryId: it.entryId })
      } else {
        const follow = (s.followUps?.[it.entryId] ?? 0) >= 1 ? typedFollowUp(it) : test(it.entryId)
        s = completeItem(s, { entryId: it.entryId, verdict: 'correct' }, undefined, follow)
        answers++
      }
      expect(sessionProgress(s).percent).toBeGreaterThanOrEqual(progress)
      progress = sessionProgress(s).percent
      expect(answers).toBeLessThan(30)
    }
    expect(answers).toBe(24)
    expect(progress).toBe(100)
  })

  it('initialises recall on the first guided written answer, without advancing it again on repetitions', () => {
    const now = new Date('2026-11-04T12:00:00Z')
    const scheduler = createScheduler({ fuzz: false })
    const item = { ...typedFollowUp(test(decision.id)), reason: 'practice' as const, learningFollowUp: true }
    const before = newWordState(decision, now)
    expect(attemptMode(item, 'normal', before)).toBe('normal')
    const after = processAttempt(before, { exerciseType: 'typed_translation', verdict: 'correct', responseMs: 5000, hintsUsed: 0, maxHints: 0, at: now, mode: attemptMode(item, 'normal', before) }, [], scheduler).state
    expect(after.skills.recall?.reps).toBe(1)
    expect(attemptMode(item, 'normal', after)).toBe('practice')
    expect(attemptMode(item, 'practice', before)).toBe('practice')
    expect(attemptMode({ ...item, learningFollowUp: undefined }, 'normal', before)).toBe('practice')
  })

  it('does not change a learning step because other words were answered well or poorly', () => {
    const item = { ...test(decision.id), skill: 'listening' as const, exerciseType: 'listen_choose' as const }
    expect(adaptExercise(item, decision, undefined, Array(8).fill('correct'), createRng(1))).toBe(item)
    expect(adaptExercise({ ...item, reason: 'practice' }, decision, undefined, Array(8).fill('correct'), createRng(1))).toEqual({ ...item, reason: 'practice' })
  })

  it('starts every new word with meaning recognition, including phrases with examples', () => {
    const entry = { ...decision, id: 'phrase', lemma: 'make a decision', partOfSpeech: 'phrase' as const }
    const plan = buildExtraNewPlan({ now: new Date(), seed: 1, settings: { language: 'en', dailyMinutes: 10, newWordsPerDay: 5 }, catalog: [entry], states: [], mistakes: [], scheduler: createScheduler() }, 1)
    expect(plan.find((it) => it.kind === 'exercise')?.exerciseType).toBe('mc_meaning')
  })

  it('treats a missing article as a near answer, not a different word-family form', () => {
    const entry = createEntry({ word: 'la maison', meaning: 'ev' }, 'fr', new Date())
    const exercise = buildExercise('typed_translation', entry, [entry], createRng(1))
    if (exercise.kind !== 'typed') throw new Error('Expected a typed exercise')
    expect(evaluateTyped(exercise, 'maison', entry, [entry])).toMatchObject({ verdict: 'near', errorType: 'article' })
    expect(evaluateTyped(exercise, 'la maison', entry, [entry])).toMatchObject({ verdict: 'correct' })
  })

  it('does not crash when all recall formats are switched off after an answer', () => {
    const item = typedFollowUp(test(decision.id))
    const next = retryItem(item, decision, newWordState(decision, new Date()), createRng(1), { off: ['typed_translation', 'speak_word', 'family_choice'] })
    expect(next).toMatchObject({ skill: 'recognition', exerciseType: 'mc_meaning' })
  })

  it('does not stack another retry on an already pending test of the same skill', () => {
    const item = { ...test(decision.id), reason: 'due' as const }
    const state = newWordState(decision, new Date())
    const s = completeItem(startSession([item, item]), { entryId: decision.id, verdict: 'wrong' }, retryItem(item, decision, state, createRng(1)))
    expect(s.items).toHaveLength(2)
    expect(s.relearn[decision.id]).toBe(2)
  })
})
