import { State, type Card } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import type { PlanItem } from '../dailyPlan'
import { MIN_ELIGIBLE, PROBES_A_DAY, probeCards, probesLeft, sampleProbes, withProbes } from '../probes'
import { createRng } from '../rng'
import { createScheduler } from '../scheduler'
import { newWordState, processAttempt } from '../review'
import type { ReviewEvent, UserWordState, VocabularyEntry } from '../types'
import { decision } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const now = new Date('2026-10-10T12:00:00Z')
const DAY = 86_400_000

const entry = (n: number): VocabularyEntry => ({ ...decision, id: `en:w${n}`, lemma: `word${n}` })

/** A word with a recognition card reviewed `ago` days back, held, due `due` days from now. */
function word(n: number, over: { ago?: number; due?: number; reps?: number; state?: State; introduced?: Date; retired?: boolean } = {}): { entry: VocabularyEntry; state: UserWordState } {
  const e = entry(n)
  const s = newWordState(e, over.introduced ?? new Date(now.getTime() - 30 * DAY))
  const card: Card = {
    ...scheduler.newCard(now),
    reps: over.reps ?? 3,
    state: over.state ?? State.Review,
    stability: 8,
    last_review: new Date(now.getTime() - (over.ago ?? 5) * DAY),
    due: new Date(now.getTime() + (over.due ?? 4) * DAY),
  }
  s.skills.recognition = card
  s.retired = over.retired
  return { entry: e, state: s }
}

const world = (words: ReturnType<typeof word>[]) => ({
  states: words.map((w) => w.state),
  catalog: new Map(words.map((w) => [w.entry.id, w.entry])),
})

describe('probe cards', () => {
  it('takes held cards that are not due and were last reviewed a while ago', () => {
    const w = world(Array.from({ length: 12 }, (_, i) => word(i)))
    const cards = probeCards(w.states, w.catalog, now)
    expect(cards).toHaveLength(12)
    expect(cards[0]).toMatchObject({ skill: 'recognition' })
    expect(cards[0].elapsedDays).toBeCloseTo(5, 1)
  })

  it('leaves out what is due today, too fresh, barely practised, not holding, new today, retired or already in the session', () => {
    const w = world([
      word(1, { due: 0 }), // due now
      word(2, { ago: 1 }), // too fresh
      word(3, { reps: 1 }),
      word(4, { state: State.Learning }),
      word(5, { introduced: now }),
      word(6, { retired: true }),
      word(7), // fine
      word(8), // fine but in the session
    ])
    const ids = probeCards(w.states, w.catalog, now, new Set(['en:w8'])).map((c) => c.entryId)
    expect(ids).toEqual(['en:w7'])
  })

  it('offers one card per word: the skill left longest', () => {
    const w = word(1)
    w.state.skills.recall = { ...w.state.skills.recognition!, last_review: new Date(now.getTime() - 9 * DAY), due: new Date(now.getTime() + 3 * DAY) }
    const c = probeCards([w.state], new Map([[w.entry.id, w.entry]]), now)
    expect(c).toHaveLength(1)
    expect(c[0].skill).toBe('recall')
  })
})

describe('sampling', () => {
  const cards = Array.from({ length: 40 }, (_, i) => ({ entryId: `en:w${i}`, skill: 'recognition' as const, elapsedDays: 3 }))

  it('picks k of them with a known, equal chance', () => {
    const { cards: picked, inclusion } = sampleProbes(cards, 2, createRng(5))
    expect(picked).toHaveLength(2)
    expect(new Set(picked.map((c) => c.entryId)).size).toBe(2)
    expect(inclusion).toBeCloseTo(2 / 40)
  })

  it('every card really has that chance (frequency over many days)', () => {
    const hits = new Map<string, number>()
    const days = 4000
    for (let d = 0; d < days; d++) for (const c of sampleProbes(cards, 2, createRng(d + 1)).cards) hits.set(c.entryId, (hits.get(c.entryId) ?? 0) + 1)
    for (const c of cards) expect((hits.get(c.entryId) ?? 0) / days).toBeGreaterThan(0.03)
    for (const c of cards) expect((hits.get(c.entryId) ?? 0) / days).toBeLessThan(0.07)
  })

  it('asks for nothing when there are too few cards to call it a sample, or no quota', () => {
    expect(sampleProbes(cards.slice(0, MIN_ELIGIBLE - 1), 2, createRng(1)).cards).toEqual([])
    expect(sampleProbes(cards, 0, createRng(1)).cards).toEqual([])
  })
})

describe('the day’s quota', () => {
  const event = (probe: number | undefined, at: Date): ReviewEvent =>
    ({ id: Math.random().toString(), timestamp: at, ctx: probe === undefined ? undefined : { probe, elapsedDays: 3, stabilityBefore: 5, difficultyBefore: 5, policy: 'heuristic-v1' } }) as unknown as ReviewEvent

  it('counts only today’s probes', () => {
    expect(probesLeft([], now)).toBe(PROBES_A_DAY)
    expect(probesLeft([event(0.05, now)], now)).toBe(PROBES_A_DAY - 1)
    expect(probesLeft([event(0.05, now), event(0.05, now), event(0.05, now)], now)).toBe(0)
    expect(probesLeft([event(0.05, new Date(now.getTime() - 2 * DAY)), event(undefined, now)], now)).toBe(PROBES_A_DAY)
  })
})

describe('putting them in the plan', () => {
  const plan: PlanItem[] = Array.from({ length: 20 }, (_, i) => ({ kind: 'exercise', entryId: `en:p${i}`, reason: 'due', skill: 'recognition', exerciseType: 'mc_meaning' }))
  const w = world(Array.from({ length: 20 }, (_, i) => word(i)))
  const states = new Map(w.states.map((s) => [s.entryId, s]))

  it('adds practice-mode items marked with their chance, never first and never in the last tenth', () => {
    const { cards, inclusion } = sampleProbes(probeCards(w.states, w.catalog, now), 2, createRng(3))
    const out = withProbes(plan, { cards, inclusion }, w.catalog, states, createRng(4))
    expect(out).toHaveLength(22)
    const at = out.map((it, i) => (it.probe !== undefined ? i : -1)).filter((i) => i >= 0)
    expect(at).toHaveLength(2)
    for (const i of at) {
      expect(out[i]).toMatchObject({ kind: 'exercise', reason: 'practice', probe: inclusion })
      expect(i).toBeGreaterThanOrEqual(1)
      expect(i).toBeLessThan(out.length - 1)
    }
    expect(out.filter((it) => it.probe === undefined)).toEqual(plan)
  })

  it('leaves a very short session alone', () => {
    const { cards, inclusion } = sampleProbes(probeCards(w.states, w.catalog, now), 2, createRng(3))
    expect(withProbes(plan.slice(0, 3), { cards, inclusion }, w.catalog, states, createRng(4))).toHaveLength(3)
  })
})

describe('what an answer keeps of the moment', () => {
  it('reads the context off the card and the plan: age of the memory, stability, why, where, probe', () => {
    const w = word(1, { ago: 6 })
    const { event } = processAttempt(w.state, { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 1500, hintsUsed: 0, maxHints: 3, at: now, mode: 'practice', plan: { reason: 'practice', slot: 7, probe: 0.05 } }, [], scheduler)
    expect(event.ctx).toMatchObject({ policy: 'bridge-v1', reason: 'practice', slot: 7, probe: 0.05, stabilityBefore: 8 })
    expect(event.ctx?.elapsedDays).toBeCloseTo(6, 1)
    expect(event.mode).toBe('practice')
  })

  it('a probe in practice mode leaves the card alone', () => {
    const w = word(1, { ago: 6 })
    const before = w.state.skills.recognition
    const { state } = processAttempt(w.state, { exerciseType: 'mc_meaning', verdict: 'wrong', responseMs: 1500, hintsUsed: 0, maxHints: 3, at: now, mode: 'practice', plan: { probe: 0.05 } }, [], scheduler)
    expect(state.skills.recognition).toEqual(before)
  })

  it('a new card has no past', () => {
    const e = entry(9)
    const { event } = processAttempt(newWordState(e, now), { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 900, hintsUsed: 0, maxHints: 3, at: now }, [], scheduler)
    expect(event.ctx).toMatchObject({ elapsedDays: 0, policy: 'bridge-v1' })
    expect(event.ctx?.probe).toBeUndefined()
  })
})
