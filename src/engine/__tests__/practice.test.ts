import { describe, expect, it } from 'vitest'
import { recordMistake } from '../mistakes'
import { buildDeckPlan, buildMistakePlan, buildPracticePlan } from '../practice'
import { answeredToday, localDate, progressStats, studyStreak } from '../progress'
import { newWordState, processAttempt } from '../review'
import { createRng } from '../rng'
import { createScheduler } from '../scheduler'
import type { ReviewEvent, UserWordState, VocabularyEntry } from '../types'
import { affect, CATALOG, decide, decision } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const NOW = new Date('2026-10-10T09:00:00')

function practised(entry: VocabularyEntry, times = 1): UserWordState {
  let s = newWordState(entry, NOW)
  for (let i = 0; i < times; i++) {
    const at = new Date(NOW.getTime() + i * 3600_000)
    s = processAttempt(s, { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 3000, hintsUsed: 0, maxHints: 0, at }, [], scheduler, () => 'x').state
  }
  return s
}

const mistake = (entryId: string, errorType: 'collocation' | 'confusion' | 'meaning', at: Date) => ({
  entryId,
  errorType,
  exerciseType: 'mc_meaning' as const,
  given: 'x',
  expected: 'y',
  at,
})

describe('buildMistakePlan', () => {
  it('practises each word with open mistakes once, in the skill of its latest mistake', () => {
    // decision has recall practised, so collocation is unlocked.
    let s = practised(decision, 2)
    s = processAttempt(s, { exerciseType: 'typed_translation', verdict: 'correct', responseMs: 5000, hintsUsed: 0, maxHints: 3, at: NOW }, [], scheduler, () => 'x').state
    let bank = recordMistake([], mistake('en:decision', 'meaning', new Date(NOW.getTime() - 2000)))
    bank = recordMistake(bank, mistake('en:decision', 'collocation', NOW))
    bank = recordMistake(bank, mistake('en:affect', 'confusion', NOW))
    const plan = buildMistakePlan({ catalog: CATALOG, states: [s, practised(affect)], mistakes: bank, rng: createRng(1) })
    expect(plan).toHaveLength(2)
    expect(plan.find((p) => p.entryId === 'en:decision')).toMatchObject({ skill: 'collocation', reason: 'mistake' })
    expect(plan.find((p) => p.entryId === 'en:affect')).toMatchObject({ skill: 'recognition' })
  })

  it('falls back to recognition when the mistake skill is not unlocked yet', () => {
    const bank = recordMistake([], mistake('en:decision', 'collocation', NOW))
    const plan = buildMistakePlan({ catalog: CATALOG, states: [practised(decision)], mistakes: bank, rng: createRng(1) })
    expect(plan[0].skill).toBe('recognition')
  })

  it('ignores resolved mistakes and words without learning state', () => {
    const bank = recordMistake([], mistake('en:decide', 'meaning', NOW)).map((m) => ({ ...m, resolved: true }))
    expect(buildMistakePlan({ catalog: CATALOG, states: [practised(decide)], mistakes: bank, rng: createRng(1) })).toEqual([])
    const open = recordMistake([], mistake('en:decide', 'meaning', NOW))
    expect(buildMistakePlan({ catalog: CATALOG, states: [], mistakes: open, rng: createRng(1) })).toEqual([])
  })
})

describe('buildPracticePlan', () => {
  it('uses only words and skills already practised, marked as practice', () => {
    const states = [practised(decision), practised(decide), newWordState(affect, NOW)]
    const plan = buildPracticePlan({ catalog: CATALOG, states, rng: createRng(3) })
    expect(plan.map((p) => p.entryId).sort()).toEqual(['en:decide', 'en:decision'])
    expect(plan.every((p) => p.reason === 'practice' && p.skill === 'recognition')).toBe(true)
  })
  it('respects the limit', () => {
    const states = CATALOG.filter((e) => e.language === 'en').map((e) => practised(e))
    expect(buildPracticePlan({ catalog: CATALOG, states, rng: createRng(3), limit: 3 })).toHaveLength(3)
  })
})

describe('progressStats', () => {
  const event = (daysAgo: number, correct: boolean, mode: 'normal' | 'practice' = 'normal'): ReviewEvent => ({
    id: String(Math.random()),
    entryId: 'en:decision',
    language: 'en',
    skill: 'recognition',
    exerciseType: 'mc_meaning',
    direction: 'target_to_native',
    verdict: correct ? 'correct' : 'wrong',
    correct,
    rating: 3,
    responseMs: 1000,
    hintsUsed: 0,
    retrievabilityBefore: 0,
    stabilityAfter: 1,
    scheduledDays: 1,
    mode,
    timestamp: new Date(NOW.getTime() - daysAgo * 86_400_000),
  })

  it('counts stages, words not started, and daily activity (excluding practice)', () => {
    const stats = progressStats({
      vocabularyCount: 5,
      states: [practised(decision), newWordState(decide, NOW)],
      events: [event(0, true), event(0, false), event(2, true), event(0, true, 'practice'), event(30, true)],
      scheduler,
      now: NOW,
    })
    expect(stats.notStarted).toBe(3)
    expect(stats.stageCounts.introduced).toBe(2)
    expect(stats.activity).toHaveLength(14)
    expect(stats.activity.at(-1)).toEqual({ date: localDate(NOW), answers: 2, correct: 1 })
    expect(stats.daysPractised).toBe(2)
    expect(stats.activeVocabulary).toBe(0)
  })
})

describe('studyStreak', () => {
  const at = (daysAgo: number, mode: 'normal' | 'practice' = 'normal') => ({
    timestamp: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - daysAgo, 10),
    mode,
  })
  it('counts consecutive days ending today', () => {
    expect(studyStreak([at(0), at(1), at(2), at(4)], NOW)).toBe(3)
  })
  it('keeps yesterday’s streak alive before today’s session', () => {
    expect(studyStreak([at(1), at(2)], NOW)).toBe(2)
  })
  it('ignores practice mode and resets after a gap', () => {
    expect(studyStreak([at(0, 'practice'), at(2)], NOW)).toBe(0)
  })
  it('counts today’s real answers', () => {
    expect(answeredToday([at(0), at(0), at(0, 'practice'), at(1)], NOW)).toBe(2)
  })
})

describe('buildDeckPlan', () => {
  it('gives every deck word one item, introducing unseen words first', () => {
    const plan = buildDeckPlan({ catalog: [decision, decide, affect], states: [practised(decision)], rng: createRng(5), scheduler, now: NOW })
    expect(plan.filter((p) => p.kind === 'introduce').map((p) => p.entryId).sort()).toEqual(['en:affect', 'en:decide'])
    expect(plan.filter((p) => p.kind === 'exercise')).toHaveLength(3)
  })
})

describe('speech and dictation exercises', () => {
  it('are offered only when supported / applicable', async () => {
    const { exerciseTypesFor } = await import('../exercises')
    expect(exerciseTypesFor('recall', decide)).not.toContain('speak_word')
    expect(exerciseTypesFor('recall', decide, { speech: true })).toContain('speak_word')
    expect(exerciseTypesFor('listening', decision)).toContain('dictation')
  })
})
