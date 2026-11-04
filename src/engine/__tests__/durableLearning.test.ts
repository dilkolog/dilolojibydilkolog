import { describe, expect, it } from 'vitest'
import { State } from 'ts-fsrs'
import { advanceLearning, attemptMode, honorOff, currentItem, isFinished, MAX_RETRIES, startSession, summarize } from '../session'
import { createScheduler } from '../scheduler'
import { newWordState, processAttempt, type AttemptInput } from '../review'
import { createRng } from '../rng'
import { learningDebts, mergeLearning } from '../learningProgress'
import { masteryStage } from '../mastery'
import { buildDailyPlan, type PlanItem } from '../dailyPlan'
import { decision } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const now = new Date('2026-11-04T12:00:00Z')
const test: PlanItem = { kind: 'exercise', entryId: decision.id, reason: 'new', skill: 'recognition', exerciseType: 'mc_meaning' }
const input = (over: Partial<AttemptInput> = {}): AttemptInput => ({ exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 5000, hintsUsed: 0, maxHints: 2, at: now, mode: 'normal', guided: true, ...over })
const play = (state = newWordState(decision, now), over: Partial<AttemptInput> = {}) => processAttempt(state, input(over), [], scheduler).state

describe('durable independent learning', () => {
  it('keeps a debt for hinted, uncertain and near answers, until two independent recoveries', () => {
    for (const over of [{ hintsUsed: 1 }, { confidence: 'unsure' as const }, { verdict: 'near' as const }]) {
      let state = play(undefined, over)
      expect(learningDebts(state)).toEqual(['recognition'])
      state = play(state)
      expect(state.learning?.recognition?.remaining).toBe(1)
      state = play(state)
      expect(state.learning?.recognition?.remaining).toBe(0)
    }
  })

  it('records a later repetition failure in FSRS and the mistake bank', () => {
    const before = play()
    const item = { ...test, reason: 'practice' as const, learningFollowUp: true }
    const evidence = { verdict: 'wrong' as const, hintsUsed: 0, maxHints: 2 }
    const mode = attemptMode(item, 'normal', before, evidence)
    expect(mode).toBe('normal')
    const result = processAttempt(before, input({ ...evidence, mode, errorType: 'meaning' }), [], scheduler)
    expect(result.state.skills.recognition?.due.getTime()).toBeLessThanOrEqual(now.getTime() + 60_000)
    expect(result.state.stats.wrong).toBe(1)
    expect(result.mistakes).toHaveLength(1)
    expect(result.state.learning?.recognition?.remaining).toBe(2)
    // Recovered answers preserve the existing FSRS card, but clear the learning debt.
    const goodMode = attemptMode(item, 'normal', result.state, { verdict: 'correct', hintsUsed: 0, maxHints: 2 })
    expect(goodMode).toBe('practice')
    const recovered = play(result.state, { mode: goodMode })
    expect(recovered.skills.recognition).toEqual(result.state.skills.recognition)
    expect(recovered.learning?.recognition?.remaining).toBe(1)
  })

  it('does not create evidence, debt or scheduling changes for free practice', () => {
    const before = play()
    const after = play(before, { mode: 'practice', guided: false, verdict: 'wrong' })
    expect(after.learning).toEqual(before.learning)
    expect(after.skills).toEqual(before.skills)
  })

  it('distinguishes fast recognition from slow recognition without skipping productive recall', () => {
    const intro: PlanItem = { ...test, kind: 'introduce' }
    for (const [responseMs, expected] of [[1500, 'typed_translation'], [6000, 'mc_meaning']] as const) {
      let s = startSession([intro, test])
      s = { ...s, index: 1, log: [{ entryId: decision.id, item: intro }] }
      s = advanceLearning(s, { entryId: decision.id, verdict: 'correct', independent: true, responseMs }, decision, play(), createRng(1))
      expect(currentItem(s)?.exerciseType).toBe(expected)
      if (responseMs === 1500) {
        const state = play(undefined, { exerciseType: 'typed_translation' })
        s = advanceLearning(s, { entryId: decision.id, verdict: 'correct', independent: true, responseMs }, decision, state, createRng(1))
        expect(isFinished(s)).toBe(true)
      }
    }
  })

  it('does not count an assisted correct answer as completing a learning step', () => {
    const s = advanceLearning(startSession([test]), { entryId: decision.id, verdict: 'correct', independent: false }, decision, play(undefined, { hintsUsed: 2 }), createRng(1))
    expect(s.relearn[decision.id]).toBe(2)
    expect(isFinished(s)).toBe(false)
    expect(attemptMode({ ...test, reason: 'practice', learningFollowUp: true }, 'normal', play(), { verdict: 'correct', hintsUsed: 2, maxHints: 2 })).toBe('normal')
  })

  it('keeps capped words as next-round priority even when their cards are not due', () => {
    let state = newWordState(decision, now)
    let s = startSession([test])
    while (!isFinished(s)) {
      state = play(state, { verdict: 'wrong' })
      s = advanceLearning(s, { entryId: decision.id, verdict: 'wrong', independent: false }, decision, state, createRng(1))
    }
    expect(s.log).toHaveLength(1 + MAX_RETRIES)
    expect(summarize(s).pendingLearning).toEqual([decision.id])
    state.skills.recognition!.due = new Date(now.getTime() + 86400000)
    const plan = buildDailyPlan({ now, seed: 1, catalog: [decision], states: [state], mistakes: [], scheduler, settings: { language: 'en', dailyMinutes: 5, newWordsPerDay: 0 } })
    expect(plan.items[0]).toMatchObject({ entryId: decision.id, reason: 'mistake', learningFollowUp: true })
  })

  it('merges a debt repayment independently of the FSRS card timestamps', () => {
    const old = { recognition: { remaining: 2, at: now.toISOString(), delayed: false } }
    const next = { recognition: { remaining: 0, at: new Date(now.getTime() + 1000).toISOString(), delayed: false } }
    expect(mergeLearning(old, next)).toEqual(next)
    expect(mergeLearning(next, old)).toEqual(next)
  })

  it('does not mistake an immediate recovery of an old forgotten word for delayed recall', () => {
    const old = newWordState(decision, new Date(now.getTime() - 10 * 86400000))
    const failed = play(old, { exerciseType: 'typed_translation', verdict: 'wrong' })
    const recovered = play(failed, { exerciseType: 'typed_translation', mode: 'practice', at: new Date(now.getTime() + 60000) })
    expect(recovered.learning?.recall?.delayed).toBe(false)
    const later = play(recovered, { exerciseType: 'typed_translation', at: new Date(now.getTime() + 86400000) })
    expect(later.learning?.recall?.delayed).toBe(true)
  })

  it('keeps the productive recall goal even if a round is interrupted after recognition', () => {
    const state = play(undefined, { recallExpected: true })
    expect(state.learning?.recall?.remaining).toBe(1)
  })

  it('merges same-millisecond repayments by sequence and resolves concurrent conflicts conservatively', () => {
    const old = { recall: { remaining: 2, at: now.toISOString(), delayed: false, sequence: 1 } }
    const cleared = { recall: { remaining: 0, at: now.toISOString(), delayed: true, sequence: 3 } }
    expect(mergeLearning(old, cleared)).toEqual(cleared)
    expect(mergeLearning(cleared, old)).toEqual(cleared)
    const conflict = { recall: { ...cleared.recall, remaining: 1, delayed: false } }
    expect(mergeLearning(conflict, cleared)).toEqual(mergeLearning(cleared, conflict))
    expect(mergeLearning(conflict, cleared)?.recall?.remaining).toBe(1)
  })

  it('does not repay a recall failure by answering an easier recognition question', () => {
    const recall = { ...test, skill: 'recall' as const, exerciseType: 'typed_translation' as const }
    let state = play(undefined, { exerciseType: 'typed_translation', verdict: 'wrong' })
    let s = startSession([recall, test])
    s = advanceLearning(s, { entryId: decision.id, verdict: 'wrong', independent: false }, decision, state, createRng(1))
    state = play(state)
    s = advanceLearning(s, { entryId: decision.id, verdict: 'correct', independent: true, responseMs: 6000 }, decision, state, createRng(1))
    expect(s.relearn[decision.id]).toBe(2)
    expect(currentItem(s)?.skill).toBe('recall')
    expect(state.learning?.recall?.remaining).toBe(2)
  })

  it('replaces paused questions whose AI capability or example has disappeared', () => {
    const item = { ...test, skill: 'production' as const, exerciseType: 'back_translation' as const }
    expect(honorOff(item, decision, newWordState(decision, now), createRng(1), { ai: false }).exerciseType).not.toBe('back_translation')
    const withoutExamples = { ...decision, corpus: [], senses: decision.senses.map((s) => ({ ...s, examples: [] })) }
    expect(honorOff({ ...test, exerciseType: 'mc_context' }, withoutExamples, newWordState(decision, now), createRng(1)).exerciseType).toBe('mc_meaning')
  })

  it('requires delayed independent recall for new words to reach the high mastery stages', () => {
    let state = play(undefined, { exerciseType: 'typed_translation' })
    const card = { ...scheduler.newCard(now), state: State.Review, stability: 40, difficulty: 5, reps: 4, last_review: now }
    state = { ...state, skills: { recognition: card, recall: card, production: card } }
    expect(masteryStage(state)).toBe('recallable')
    state = play(state, { exerciseType: 'typed_translation', at: new Date(now.getTime() + 86400000) })
    expect(state.learning?.recall?.delayed).toBe(true)
    expect(masteryStage(state)).toBe('mastered')
    expect(masteryStage({ ...state, learning: undefined })).toBe('mastered')
  })
})
