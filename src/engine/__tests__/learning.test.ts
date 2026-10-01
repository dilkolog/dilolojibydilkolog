import { State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../exercises'
import { masteryStage, skillProfile, skillScores } from '../mastery'
import { markKnown, newWordState, processAttempt, type AttemptInput } from '../review'
import { createScheduler } from '../scheduler'
import { dueSkills, unlockedSkills } from '../selection'
import type { ExerciseType, Mistake, Skill, UserWordState } from '../types'
import { decide, decision } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const T0 = new Date('2026-10-01T09:00:00Z')
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000)
let seq = 0
const id = () => `ev${++seq}`

function answer(
  state: UserWordState,
  exerciseType: ExerciseType,
  at: Date,
  over: Partial<AttemptInput> = {},
  mistakes: Mistake[] = [],
) {
  return processAttempt(
    state,
    { exerciseType, verdict: 'correct', responseMs: EXERCISES[exerciseType].expectedMs, hintsUsed: 0, maxHints: 3, at, ...over },
    mistakes,
    scheduler,
    id,
  )
}

const DEFAULT_TYPE: Record<Skill, ExerciseType> = {
  recognition: 'mc_meaning',
  recall: 'typed_translation',
  production: 'cloze_typed',
  listening: 'listen_choose',
  collocation: 'collocation_choice',
}

/** Answers every due skill each day; `failing` skills are always answered wrong. */
function simulate(days: number, failing: Skill[] = []) {
  let state = newWordState(decision, T0)
  for (let d = 0; d < days; d++) {
    const now = new Date(T0.getTime() + d * 86_400_000)
    // Several passes per day, like re-queuing within a session (learning steps are minutes).
    for (let pass = 0; pass < 4; pass++) {
      const at = new Date(now.getTime() + pass * 15 * 60_000)
      for (const { skill } of dueSkills(state, decision, scheduler, at)) {
        const verdict = failing.includes(skill) ? 'wrong' : 'correct'
        state = answer(state, DEFAULT_TYPE[skill], at, { verdict }).state
      }
    }
  }
  return state
}

describe('progressive unlocking', () => {
  it('a new word starts with recognition only', () => {
    expect(unlockedSkills(undefined, decision)).toEqual(['recognition'])
    expect(unlockedSkills(newWordState(decision, T0), decision)).toEqual(['recognition'])
  })

  it('listening unlocks after first exposure, recall after recognition graduates', () => {
    let s = answer(newWordState(decision, T0), 'mc_meaning', T0).state
    expect(s.skills.recognition!.state).not.toBe(State.Review)
    expect(unlockedSkills(s, decision)).toEqual(['recognition', 'listening'])

    s = answer(s, 'mc_meaning', minutes(15)).state
    expect(s.skills.recognition!.state).toBe(State.Review)
    expect(unlockedSkills(s, decision)).toContain('recall')
  })

  it('collocation and production unlock only when the word has data for them', () => {
    const s = simulate(10)
    expect(unlockedSkills(s, decision)).toEqual(expect.arrayContaining(['collocation', 'production']))
    let d = newWordState(decide, T0)
    for (let i = 0; i < 3; i++) d = answer(d, 'mc_meaning', minutes(i * 15)).state
    d = answer(d, 'typed_translation', minutes(60)).state
    expect(unlockedSkills(d, decide)).not.toContain('collocation')
  })

  it('a newly unlocked skill waits until the next day, then is due first (weakest)', () => {
    let s = answer(newWordState(decision, T0), 'mc_meaning', T0).state
    s = answer(s, 'mc_meaning', minutes(15)).state
    expect(dueSkills(s, decision, scheduler, minutes(16))).toEqual([])
    const tomorrow = new Date(T0.getTime() + 86_400_000)
    const due = dueSkills(s, decision, scheduler, tomorrow)
    expect(due[0]).toMatchObject({ retrievability: 0 })
    expect(due.map((d) => d.skill)).toEqual(expect.arrayContaining(['listening', 'recall']))
  })
})

describe('review processing', () => {
  it('records an event with the observed signals', () => {
    const r = answer(newWordState(decision, T0), 'typed_translation', T0, { hintsUsed: 1, responseMs: 9000 })
    expect(r.event).toMatchObject({
      entryId: 'en:decision',
      skill: 'recall',
      direction: 'native_to_target',
      correct: true,
      hintsUsed: 1,
      responseMs: 9000,
      retrievabilityBefore: 0,
      mode: 'normal',
    })
    expect(r.state.stats).toMatchObject({ reviews: 1, correct: 1, hints: 1 })
  })

  it('logs near misses and errors in the Mistake Bank; correct answers count toward resolving', () => {
    const s = newWordState(decision, T0)
    const r1 = answer(s, 'collocation_choice', T0, {
      verdict: 'wrong',
      errorType: 'collocation',
      given: 'do a decision',
      expected: 'make a decision',
    })
    expect(r1.mistakes).toHaveLength(1)
    expect(r1.state.stats.consecutiveWrong).toBe(1)
    const r2 = answer(r1.state, 'mc_meaning', minutes(1), {}, r1.mistakes)
    expect(r2.mistakes[0].correctSince).toBe(1)
  })

  it('practice mode is low-stakes: no schedule change, no mistakes', () => {
    const s = answer(newWordState(decision, T0), 'mc_meaning', T0).state
    const r = answer(s, 'mc_meaning', minutes(5), { verdict: 'wrong', errorType: 'meaning', mode: 'practice' })
    expect(r.state.skills).toEqual(s.skills)
    expect(r.state.stats).toEqual(s.stats)
    expect(r.mistakes).toHaveLength(0)
    expect(r.event.mode).toBe('practice')
  })

  it('recognition and production are scheduled independently', () => {
    const s = simulate(30, ['production'])
    expect(s.skills.recognition!.stability).toBeGreaterThan(10)
    expect(s.skills.production!.stability).toBeLessThan(1)
    expect(s.skills.production!.due.getTime()).toBeLessThan(s.skills.recognition!.due.getTime())
  })
})

describe('mastery', () => {
  it('a new word is "introduced"', () => {
    expect(masteryStage(newWordState(decision, T0))).toBe('introduced')
  })

  it('critical rule: strong recognition with failing production is never mastered', () => {
    const s = simulate(120, ['production'])
    expect(s.skills.recognition!.stability).toBeGreaterThan(21)
    expect(['strong', 'recallable']).toContain(masteryStage(s))
  })

  it('consistent success across skills eventually reaches mastered', () => {
    const s = simulate(120)
    expect(masteryStage(s)).toBe('mastered')
  })

  it('skill scores are 0–100 and 0 for unpractised skills', () => {
    const s = answer(newWordState(decision, T0), 'mc_meaning', T0).state
    const scores = skillScores(s, scheduler, minutes(1))
    expect(scores.recognition).toBeGreaterThan(90)
    expect(scores.production).toBe(0)
  })

  it('profile averages only over words where the skill was practised', () => {
    const a = simulate(30)
    const b = newWordState(decide, T0)
    const p = skillProfile([a, b], scheduler, new Date(T0.getTime() + 30 * 86_400_000))
    expect(p.production).not.toBeNull()
    expect(skillProfile([b], scheduler, T0).production).toBeNull()
  })
})

describe('AI option', () => {
  it('unlocks production for a word without examples only when AI can grade free sentences', () => {
    const bare = { ...decide, senses: [{ ...decide.senses[0], examples: [] }] }
    let s = newWordState(bare, T0)
    s = answer(s, 'mc_meaning', T0).state
    s = answer(s, 'mc_meaning', minutes(15)).state
    s = answer(s, 'typed_translation', minutes(30)).state
    s = answer(s, 'typed_translation', minutes(45)).state
    expect(s.skills.recall!.state).toBe(State.Review)
    expect(unlockedSkills(s, bare)).not.toContain('production')
    expect(unlockedSkills(s, bare, { ai: true })).toContain('production')
  })
})

describe('markKnown', () => {
  it('graduates recognition and recall with a long first interval', () => {
    const s = markKnown(newWordState(decision, T0), scheduler, T0)
    expect(s.skills.recognition!.state).toBe(State.Review)
    expect(s.skills.recall!.state).toBe(State.Review)
    expect(s.skills.recall!.scheduled_days).toBeGreaterThanOrEqual(3)
    // Self-assessed knowledge starts high; the first real review corrects it if it was wrong.
    expect(masteryStage(s)).toBe('strong')
  })
})

describe('skill tie-break', () => {
  it('when two new skills are equally due, recall comes before listening', () => {
    let s = answer(newWordState(decision, T0), 'mc_meaning', T0).state
    s = answer(s, 'mc_meaning', minutes(15)).state
    const due = dueSkills(s, decision, scheduler, new Date(T0.getTime() + 86_400_000))
    expect(due.map((d) => d.skill).slice(0, 2)).toEqual(['recall', 'listening'])
  })
})
