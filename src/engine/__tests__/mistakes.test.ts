import { describe, expect, it } from 'vitest'
import { openMistakes, recordCorrect, recordMistake, RESOLVE_AFTER_CORRECT } from '../mistakes'

const m = {
  entryId: 'en:decision',
  errorType: 'collocation' as const,
  exerciseType: 'collocation_choice' as const,
  given: 'do a decision',
  expected: 'make a decision',
  at: new Date('2026-10-01T10:00:00Z'),
}

describe('Mistake Bank', () => {
  it('merges repeated identical mistakes', () => {
    let bank = recordMistake([], m)
    bank = recordMistake(bank, { ...m, at: new Date('2026-10-02T10:00:00Z') })
    expect(bank).toHaveLength(1)
    expect(bank[0].count).toBe(2)
    expect(bank[0].lastAt.toISOString()).toBe('2026-10-02T10:00:00.000Z')
  })

  it('resolves after enough correct answers, and re-opens if the mistake recurs', () => {
    let bank = recordMistake([], m)
    for (let i = 0; i < RESOLVE_AFTER_CORRECT - 1; i++) bank = recordCorrect(bank, m.entryId)
    expect(openMistakes(bank)).toHaveLength(1)
    bank = recordCorrect(bank, m.entryId)
    expect(openMistakes(bank)).toHaveLength(0)
    bank = recordMistake(bank, m)
    expect(openMistakes(bank)).toHaveLength(1)
    expect(bank[0].correctSince).toBe(0)
  })

  it('does not touch other words', () => {
    const bank = recordCorrect(recordMistake([], m), 'en:other')
    expect(bank[0].correctSince).toBe(0)
  })
})
