import { describe, expect, it } from 'vitest'
import { buildExercise, EXERCISES } from '../exercises'
import { suffixVariants } from '../morphology'
import { createRng } from '../rng'
import type { VocabularyEntry } from '../types'
import { decide, decision } from './fixtures'

describe('word family exercise', () => {
  it('makes plausible wrong suffixes on the same stem', () => {
    const v = suffixVariants('décision', 'fr')
    expect(v).toHaveLength(3)
    for (const w of v) {
      expect(w.startsWith('déci')).toBe(true)
      expect(w).not.toBe('décision')
    }
    expect(suffixVariants('aprovechamiento', 'es').every((w) => w.startsWith('aprovecha'))).toBe(true)
  })

  it('asks for the right form when the word is linked to a relative', () => {
    const linked: VocabularyEntry = { ...decision, wordFamily: [{ lemma: 'decide', partOfSpeech: 'verb', gloss: 'karar vermek', entryId: decide.id }] }
    expect(EXERCISES.family_choice.applicable({ ...decision, wordFamily: [] })).toBe(false)
    expect(EXERCISES.family_choice.applicable(linked)).toBe(true)
    const ex = buildExercise('family_choice', linked, [linked, decide], createRng(3))
    expect(ex.kind).toBe('choice')
    if (ex.kind !== 'choice') return
    expect(ex.options.find((o) => o.id === ex.correctOptionId)?.label).toBe('decision')
    expect(ex.options).toHaveLength(4)
    expect(ex.context).toContain('decide')
  })
})
