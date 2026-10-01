import { describe, expect, it } from 'vitest'
import { buildDailyPlan, interleave, type PlanInput, type PlanItem } from '../dailyPlan'
import { recordMistake } from '../mistakes'
import { newWordState, processAttempt } from '../review'
import { createScheduler } from '../scheduler'
import type { UserWordState, VocabularyEntry } from '../types'
import { abandon, affect, CATALOG, decide, decision, effect, EN_CATALOG, improve, leave } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const NOW = new Date('2026-10-10T09:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

const settings = { language: 'en' as const, level: 'B1' as const, dailyMinutes: 12, newWordsPerDay: 4 }
const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  now: NOW,
  settings,
  catalog: CATALOG,
  states: [],
  mistakes: [],
  scheduler,
  seed: 7,
  ...over,
})

function learned(entry: VocabularyEntry, at: Date, verdict: 'correct' | 'wrong' = 'correct'): UserWordState {
  return processAttempt(
    newWordState(entry, at),
    { exerciseType: 'mc_meaning', verdict, responseMs: 3000, hintsUsed: 0, maxHints: 0, at },
    [],
    scheduler,
    () => 'x',
  ).state
}

describe('new words', () => {
  it('introduces words around the user level, most frequent first, in the chosen language', () => {
    const plan = buildDailyPlan(input())
    expect(plan.newEntryIds.length).toBeGreaterThan(0)
    expect(plan.newEntryIds.every((id) => id.startsWith('en:'))).toBe(true)
    // leave is A1 — two levels below B1 — so it is outside the band.
    expect(plan.newEntryIds).not.toContain('en:leave')
    expect(plan.newEntryIds[0]).toBe('en:decide')
  })

  it('never introduces two confusable words together (interference control)', () => {
    const plan = buildDailyPlan(input({ settings: { ...settings, newWordsPerDay: 10, dailyMinutes: 60 } }))
    const both = ['en:affect', 'en:effect'].filter((id) => plan.newEntryIds.includes(id))
    expect(both.length).toBe(1)
  })

  it('waits for the interference window after a related word was introduced', () => {
    const recent = buildDailyPlan(input({ states: [learned(effect, daysAgo(1))], settings: { ...settings, newWordsPerDay: 10, dailyMinutes: 60 } }))
    expect(recent.newEntryIds).not.toContain('en:affect')
    const later = buildDailyPlan(input({ states: [learned(effect, daysAgo(5))], settings: { ...settings, newWordsPerDay: 10, dailyMinutes: 60 } }))
    expect(later.newEntryIds).toContain('en:affect')
  })

  it('each new word gets an introduction before its first exercise, with a gap', () => {
    const plan = buildDailyPlan(input({ settings: { ...settings, dailyMinutes: 30 } }))
    for (const id of plan.newEntryIds) {
      const intro = plan.items.findIndex((i) => i.entryId === id && i.kind === 'introduce')
      const test = plan.items.findIndex((i) => i.entryId === id && i.kind === 'exercise')
      expect(intro).toBeGreaterThanOrEqual(0)
      expect(test).toBeGreaterThan(intro)
    }
  })
})

describe('reviews', () => {
  it('puts forgotten words first and labels reasons', () => {
    const forgotten = learned(decision, daysAgo(30))
    const plan = buildDailyPlan(input({ states: [forgotten], settings: { ...settings, newWordsPerDay: 0 } }))
    expect(plan.items[0]).toMatchObject({ entryId: 'en:decision', reason: 'forgotten', kind: 'exercise' })
    expect(plan.counts.forgotten).toBe(1)
  })

  it('adds words with open mistakes even when not due', () => {
    const s = learned(decide, daysAgo(1))
    const fresh = { ...s, skills: { recognition: { ...s.skills.recognition!, due: daysAgo(-5) } } }
    const mistakes = recordMistake([], {
      entryId: 'en:decide',
      errorType: 'meaning',
      exerciseType: 'mc_meaning',
      given: 'x',
      expected: 'karar vermek',
      at: daysAgo(1),
    })
    const plan = buildDailyPlan(input({ states: [fresh], mistakes, settings: { ...settings, newWordsPerDay: 0 } }))
    expect(plan.items).toEqual([expect.objectContaining({ entryId: 'en:decide', reason: 'mistake' })])
  })

  it('a review backlog larger than the budget blocks new words and is trimmed to fit', () => {
    const states = EN_CATALOG.map((e) => learned(e, daysAgo(20)))
    const plan = buildDailyPlan(input({ states, settings: { ...settings, dailyMinutes: 1 } }))
    expect(plan.newEntryIds).toEqual([])
    expect(plan.estimatedMinutes).toBeLessThanOrEqual(1)
    expect(plan.items.length).toBeLessThan(states.length)
  })

  it('is deterministic for the same seed', () => {
    const states = [abandon, affect, improve, leave].map((e) => learned(e, daysAgo(4)))
    expect(buildDailyPlan(input({ states }))).toEqual(buildDailyPlan(input({ states })))
  })
})

describe('interleave', () => {
  it('avoids the same exercise type or word back to back when possible', () => {
    const items: PlanItem[] = [
      ...['a', 'b', 'c'].map((e) => ({ kind: 'exercise' as const, entryId: e, reason: 'due' as const, skill: 'recognition' as const, exerciseType: 'mc_meaning' as const })),
      ...['d', 'e', 'f'].map((e) => ({ kind: 'exercise' as const, entryId: e, reason: 'due' as const, skill: 'recall' as const, exerciseType: 'typed_translation' as const })),
    ]
    const out = interleave(items, () => 0.5)
    for (let i = 1; i < out.length; i++) expect(out[i].exerciseType).not.toBe(out[i - 1].exerciseType)
  })
})
