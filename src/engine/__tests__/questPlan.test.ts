import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../exercises'
import { buildQuestPlan } from '../questPlan'
import { newWordState, processAttempt } from '../review'
import { createRng } from '../rng'
import { createScheduler } from '../scheduler'
import type { UserWordState, VocabularyEntry } from '../types'
import { CATALOG, decide, decision, effect } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const NOW = new Date('2026-10-10T09:00:00')

/** A word whose recognition and recall have both been learned (two right answers each through the learning step). */
function learned(entry: VocabularyEntry): UserWordState {
  let s = newWordState(entry, NOW)
  for (const type of ['mc_meaning', 'typed_translation'] as const)
    for (const m of [0, 15])
      s = processAttempt(s, { exerciseType: type, verdict: 'correct', responseMs: 3000, hintsUsed: 0, maxHints: type === 'mc_meaning' ? 0 : 3, at: new Date(NOW.getTime() + m * 60_000) }, [], scheduler, () => 'x').state
  return s
}

const later = new Date(NOW.getTime() + 3 * 86_400_000)

describe('buildQuestPlan', () => {
  const states = [learned(decision), learned(decide), learned(effect)]

  it('asks questions answered by typing for the typing quest', () => {
    const items = buildQuestPlan('typedCorrect', 5, { catalog: CATALOG, states, rng: createRng(1), now: later })
    expect(items.length).toBeGreaterThan(0)
    for (const it of items) expect(EXERCISES[it.exerciseType!].input).toBe('typed')
    expect(new Set(items.map((i) => i.entryId)).size).toBe(items.length)
  })

  it('asks listening questions for the listening quest, none when the learner switched them all off', () => {
    const items = buildQuestPlan('listenCorrect', 5, { catalog: CATALOG, states, rng: createRng(1), now: later })
    expect(items.length).toBeGreaterThan(0)
    for (const it of items) expect(it.skill).toBe('listening')
    const off = buildQuestPlan('listenCorrect', 5, { catalog: CATALOG, states, rng: createRng(1), now: later, options: { off: ['listen_choose', 'listen_type', 'dictation'] } })
    expect(off).toEqual([])
  })

  it('takes only words being learned, and is empty without any', () => {
    expect(buildQuestPlan('typedCorrect', 5, { catalog: CATALOG, states: [], rng: createRng(1), now: later })).toEqual([])
    const only = buildQuestPlan('typedCorrect', 5, { catalog: CATALOG, states: [states[0]], rng: createRng(1), now: later })
    expect(only.every((i) => i.entryId === decision.id)).toBe(true)
  })

  it('does not ask for far more than is left', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ ...decision, id: `en:w${i}`, lemma: `w${i}` }))
    const manyStates = many.map((e) => learned(e))
    expect(buildQuestPlan('typedCorrect', 2, { catalog: many, states: manyStates, rng: createRng(1), now: later }).length).toBe(8)
    expect(buildQuestPlan('typedCorrect', 100, { catalog: many, states: manyStates, rng: createRng(1), now: later }).length).toBe(30)
  })
})
