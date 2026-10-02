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

describe('high-confidence mistakes', () => {
  it('a wrong answer given while sure is flagged and stays flagged when repeated', async () => {
    const { processAttempt, newWordState } = await import('../review')
    const { createScheduler } = await import('../scheduler')
    const { decision } = await import('./fixtures')
    const sched = createScheduler({ fuzz: false })
    const at = new Date('2026-10-01T10:00:00')
    const input = { exerciseType: 'typed_translation' as const, verdict: 'wrong' as const, errorType: 'meaning' as const, given: 'x', expected: 'decision', responseMs: 4000, hintsUsed: 0, maxHints: 3, at }
    const sure = processAttempt(newWordState(decision, at), { ...input, confidence: 'sure' }, [], sched)
    expect(sure.mistakes[0].highConfidence).toBe(true)
    expect(sure.event.confidence).toBe('sure')
    const again = processAttempt(sure.state, { ...input, confidence: 'unsure' }, sure.mistakes, sched)
    expect(again.mistakes[0].highConfidence).toBe(true)
    const unsure = processAttempt(newWordState(decision, at), { ...input, confidence: 'unsure' }, [], sched)
    expect(unsure.mistakes[0].highConfidence).toBeFalsy()
  })
})

describe('writingMistakes', () => {
  it('keeps only mistakes about listed words, mapping general grammar to a form error', async () => {
    const { writingMistakes } = await import('../mistakes')
    const vocab = [{ id: 'fr:décision', lemma: 'décision', article: 'la' }]
    const at = new Date('2026-10-02T10:00:00')
    const out = writingMistakes(
      [
        { original: 'le décision', correction: 'la décision', type: 'gender', lemma: 'la décision' },
        { original: 'je suis allé', correction: 'je suis allée', type: 'grammar', lemma: '' },
        { original: 'décisions prend', correction: 'décisions prises', type: 'grammar', lemma: 'décision' },
      ],
      vocab,
      at,
    )
    expect(out).toEqual([
      { entryId: 'fr:décision', errorType: 'gender', exerciseType: 'free_sentence', given: 'le décision', expected: 'la décision', at },
      { entryId: 'fr:décision', errorType: 'form', exerciseType: 'free_sentence', given: 'décisions prend', expected: 'décisions prises', at },
    ])
  })
})
