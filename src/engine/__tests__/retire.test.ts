import { describe, expect, it } from 'vitest'
import { buildDailyPlan, type PlanInput } from '../dailyPlan'
import { newWordState, processAttempt } from '../review'
import { isRetired, qualifiesForRetirement, SURPRISE_PER_DAY } from '../retire'
import { createScheduler } from '../scheduler'
import { SKILLS, type UserWordState, type VocabularyEntry } from '../types'
import { abandon, affect, decide, decision, effect, improve, leave } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const NOW = new Date('2026-10-10T09:00:00Z')

/** A word with every skill rock solid (stability way past the threshold) and due today. */
function solid(entry: VocabularyEntry, stability = 400): UserWordState {
  const s = newWordState(entry, new Date('2025-01-01'))
  const card = { ...scheduler.newCard(NOW), state: 2, stability, difficulty: 3, reps: 12, lapses: 0, due: new Date(NOW.getTime() - 3_600_000), last_review: new Date('2025-09-01') }
  return { ...s, skills: Object.fromEntries(SKILLS.map((k) => [k, card])), stats: { ...s.stats, reviews: 40, correct: 40 } } as UserWordState
}

const input = (states: UserWordState[], autoRetire = true): PlanInput => ({
  now: NOW,
  settings: { language: 'en', dailyMinutes: 60, newWordsPerDay: 0, autoRetire },
  catalog: [leave, decide, decision, abandon, improve, affect, effect],
  states,
  mistakes: [],
  scheduler,
  seed: 1,
})

describe('retirement', () => {
  it('needs mastery and long stability on every skill; a manual choice wins either way', () => {
    const s = solid(leave)
    expect(qualifiesForRetirement(s)).toBe(true)
    expect(qualifiesForRetirement(solid(leave, 30))).toBe(false)
    expect(isRetired(s, true)).toBe(true)
    expect(isRetired(s, false)).toBe(false)
    expect(isRetired({ ...s, retired: false }, true)).toBe(false)
    expect(isRetired({ ...solid(leave, 30), retired: true }, false)).toBe(true)
  })

  it('keeps retired words out of the plan except a few surprise checks a day', () => {
    const states = [leave, decide, decision, abandon, improve].map((e) => solid(e))
    const reviewed = buildDailyPlan(input(states)).items.filter((i) => i.kind === 'exercise')
    expect(reviewed.length).toBe(SURPRISE_PER_DAY)
    expect(buildDailyPlan(input(states, false)).items.length).toBeGreaterThan(SURPRISE_PER_DAY)
    // Checks already done today count against the daily few.
    const done = states.map((s, i) => (i < SURPRISE_PER_DAY ? { ...s, lastReviewAt: new Date(NOW.getTime() - 60_000) } : s))
    expect(buildDailyPlan(input(done)).items.filter((i) => i.kind === 'exercise').length).toBe(0)
  })

  it('a wrong answer brings a retired word back', () => {
    const s = { ...solid(leave), retired: true }
    const after = processAttempt(s, { exerciseType: 'mc_meaning', verdict: 'wrong', responseMs: 3000, hintsUsed: 0, maxHints: 0, at: NOW }, [], scheduler, () => 'x').state
    expect(after.retired).toBeUndefined()
    expect(isRetired(after, true)).toBe(false)
  })
})
