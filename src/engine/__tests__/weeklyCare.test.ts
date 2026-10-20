import { describe, expect, it } from 'vitest'
import { careDay, careMinutes, careOf, careSteps, cleanCare, markDone, nextStep, weekKey } from '../weeklyCare'

const spot = { title: 'Aksanlarda takılıyorsun', target: 'accent' as const, action: 'Aksan antrenmanı' }

describe('weekly care round', () => {
  it('weeks start on Monday (local), and the round is offered Friday to Sunday', () => {
    expect(weekKey(new Date(2026, 9, 18))).toBe('2026-10-12') // Sunday
    expect(weekKey(new Date(2026, 9, 12))).toBe('2026-10-12') // Monday
    expect(weekKey(new Date(2026, 9, 19))).toBe('2026-10-19')
    expect([1, 2, 3, 4, 5, 6, 0].map((d) => careDay(new Date(2026, 9, 12 + ((d + 6) % 7))))).toEqual([false, false, false, false, true, true, true])
  })

  it('a step is offered only with enough behind it, and a round needs at least two steps', () => {
    expect(careSteps({ misses: 2, dueGrammar: 2 })).toEqual([])
    expect(careSteps({ misses: 5, dueGrammar: 0 })).toEqual([])
    expect(careSteps({ misses: 5, dueGrammar: 0, spot }).map((i) => i.step)).toEqual(['words', 'spot'])
    expect(careSteps({ misses: 5, dueGrammar: 4, spot }).map((i) => i.step)).toEqual(['words', 'grammar', 'spot'])
  })

  it('goes through the steps in order, remembers them for the week and starts over on a new one', () => {
    const items = careSteps({ misses: 5, dueGrammar: 4, spot })
    let state = careOf(null, new Date(2026, 9, 17))
    expect(nextStep(items, state)?.step).toBe('words')
    expect(careMinutes(items, state)).toBe(10)
    state = markDone(markDone(state, 'words'), 'words')
    expect(state.done).toEqual(['words'])
    expect(nextStep(items, state)?.step).toBe('grammar')
    expect(careMinutes(items, state)).toBe(6)
    state = markDone(markDone(state, 'grammar'), 'spot')
    expect(nextStep(items, state)).toBeUndefined()
    // The same week keeps it, the next Friday does not.
    expect(careOf(state, new Date(2026, 9, 18)).done).toHaveLength(3)
    expect(careOf(state, new Date(2026, 9, 23)).done).toEqual([])
  })

  it('reads stored state defensively', () => {
    expect(cleanCare(null)).toBeNull()
    expect(cleanCare({ week: 'x', done: [] })).toBeNull()
    expect(cleanCare({ week: '2026-10-12', done: ['words', 'words', 'nope', 3], dismissed: true })).toEqual({ week: '2026-10-12', done: ['words'], dismissed: true })
  })
})
