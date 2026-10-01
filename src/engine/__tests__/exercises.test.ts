import { describe, expect, it } from 'vitest'
import {
  BLANK,
  buildExercise,
  displayForm,
  evaluateChoice,
  evaluateTyped,
  exerciseTypesFor,
  pickDistractors,
  type ChoiceExercise,
  type TypedExercise,
} from '../exercises'
import { createRng } from '../rng'
import { abandon, affect, CATALOG, decide, decision, EN_CATALOG, laDecision, lArbre } from './fixtures'

const rng = () => createRng(42)

describe('exercise applicability', () => {
  it('only offers exercises the entry has data for', () => {
    expect(exerciseTypesFor('collocation', decision)).toEqual(['collocation_choice'])
    expect(exerciseTypesFor('collocation', decide)).toEqual([])
    expect(exerciseTypesFor('recognition', affect)).toContain('discriminate')
    expect(exerciseTypesFor('recognition', decision)).not.toContain('discriminate')
  })
})

describe('displayForm', () => {
  it('includes FR/ES articles, eliding before vowels', () => {
    expect(displayForm(laDecision)).toBe('la décision')
    expect(displayForm(lArbre)).toBe("l'arbre")
    expect(displayForm(decision)).toBe('decision')
  })
})

describe('distractors', () => {
  it('stay in the same language and exclude synonyms', () => {
    const d = pickDistractors(abandon, CATALOG, 3, rng())
    expect(d.every((x) => x.language === 'en')).toBe(true)
    expect(d.map((x) => x.id)).not.toContain('en:leave')
    expect(d.map((x) => x.id)).not.toContain('en:abandon')
  })
  it('prefer the same part of speech', () => {
    const d = pickDistractors(abandon, EN_CATALOG, 2, rng())
    expect(d.every((x) => x.partOfSpeech === 'verb')).toBe(true)
  })
})

describe('buildExercise', () => {
  it('mc_meaning has exactly one correct option with the gloss', () => {
    const ex = buildExercise('mc_meaning', decision, CATALOG, rng()) as ChoiceExercise
    expect(ex.options.length).toBe(4)
    expect(ex.options.find((o) => o.id === ex.correctOptionId)!.label).toBe('karar')
    expect(new Set(ex.options.map((o) => o.label)).size).toBe(ex.options.length)
  })

  it('cloze blanks the surface form and expects it', () => {
    const ex = buildExercise('cloze_typed', abandon, CATALOG, rng()) as TypedExercise
    expect(ex.context).toBe(`She ${BLANK} the project after three months.`)
    expect(ex.accepted).toEqual(['abandoned'])
    expect(ex.hints[0]).toBe('a _ _ _ _ _ _ _ _')
  })

  it('collocation_choice tests a collocation against its typical wrong variants', () => {
    const ex = buildExercise('collocation_choice', decision, CATALOG, rng()) as ChoiceExercise
    expect(ex.prompt).toBe('karar vermek')
    expect(ex.options.map((o) => o.label).sort()).toEqual(['do a decision', 'make a decision', 'take a decision'])
  })

  it('throws for an inapplicable exercise', () => {
    expect(() => buildExercise('collocation_choice', decide, CATALOG, rng())).toThrow()
  })
})

describe('evaluation', () => {
  it('a wrong collocation choice is classified as a collocation error', () => {
    const ex = buildExercise('collocation_choice', decision, CATALOG, rng()) as ChoiceExercise
    const wrong = ex.options.find((o) => o.label === 'do a decision')!
    expect(evaluateChoice(ex, wrong.id)).toEqual({
      verdict: 'wrong',
      errorType: 'collocation',
      given: 'do a decision',
      expected: 'make a decision',
    })
  })

  it('typing a confusable is a confusion error', () => {
    const ex = buildExercise('typed_translation', affect, CATALOG, rng()) as TypedExercise
    expect(evaluateTyped(ex, 'effect', affect, CATALOG).errorType).toBe('confusion')
  })

  it('word_form: typing the base word is a form error', () => {
    const ex = buildExercise('word_form', decision, CATALOG, createRng(1)) as TypedExercise
    expect(evaluateTyped(ex, 'decision', decision, CATALOG).errorType).toBe('form')
  })
})
