import { describe, expect, it } from 'vitest'
import { wordJourney, sourceOf } from '../journey'
import { newWordState, processAttempt } from '../review'
import { createScheduler } from '../scheduler'
import type { ReviewEvent } from '../types'
import { decision } from './fixtures'

const s = createScheduler({ fuzz: false })
const T = (d: number) => new Date(Date.UTC(2026, 8, 1 + d, 9))

describe('word journey', () => {
  it('tells where the word came from, when it grew and what went wrong, in order', () => {
    const entry = { ...decision, addedAt: T(0), notes: 'Kaynak: https://www.lemonde.fr/article' }
    let state = newWordState(entry, T(1))
    const events: ReviewEvent[] = []
    for (const [d, verdict] of [[1, 'correct'], [2, 'correct'], [5, 'correct'], [12, 'correct'], [30, 'correct'], [70, 'correct']] as const) {
      for (const exerciseType of ['mc_meaning', 'typed_translation', 'cloze_typed'] as const) {
        const r = processAttempt(state, { exerciseType, verdict, responseMs: 3000, hintsUsed: 0, maxHints: 3, at: T(d), mode: 'normal' }, [], s)
        state = r.state
        events.push(r.event)
      }
    }
    const mistakes = [{ id: 'm', entryId: entry.id, errorType: 'typo', exerciseType: 'typed_translation', given: 'decission', expected: 'decision', count: 2, firstAt: T(3), lastAt: T(4), correctSince: 0, resolved: false }] as const
    const firstEncounter = { title: 'Le Petit Prince', sentence: 'Une grave decision.', at: T(2).toISOString() }
    const steps = wordJourney(entry, state, events, [...mistakes], [{ at: T(20).toISOString(), host: 'lemonde.fr' }], firstEncounter)
    expect(sourceOf(entry)).toBe('lemonde.fr')
    expect(steps[0]).toMatchObject({ kind: 'added', source: 'lemonde.fr' })
    expect(steps[1].kind).toBe('introduced')
    expect(steps.find((x) => x.kind === 'first_met')).toMatchObject({ kind: 'first_met', where: 'Le Petit Prince' })
    expect(steps.some((x) => x.kind === 'stage' && x.up)).toBe(true)
    expect(steps.find((x) => x.kind === 'mistake')).toMatchObject({ given: 'decission' })
    expect(steps.find((x) => x.kind === 'seen')).toMatchObject({ where: 'lemonde.fr' })
    const times = steps.map((x) => x.at.getTime())
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })
})
