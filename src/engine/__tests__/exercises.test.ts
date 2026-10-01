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
  it('never include two words that are confusable with each other', () => {
    const d = pickDistractors(decision, CATALOG, 3, rng())
    const ids = d.map((x) => x.id)
    expect(ids.includes('en:affect') && ids.includes('en:effect')).toBe(false)
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

describe('AI-graded exercises', () => {
  it('free_sentence is only offered when AI is available', () => {
    expect(exerciseTypesFor('production', decide)).not.toContain('free_sentence')
    expect(exerciseTypesFor('production', decide, { ai: true })).toContain('free_sentence')
  })

  it('builds a personal prompt with progressive hints and no fixed answer', () => {
    const ex = buildExercise('free_sentence', decision, CATALOG, rng()) as TypedExercise
    expect(ex.prompt).toBe('"decision" ile bir cümle kur')
    expect(ex.context).toBeTruthy()
    expect(ex.accepted).toEqual([])
    expect(ex.hints[0]).toBe('Anlamı: karar')
  })
})

describe('confusing distractors', () => {
  it('puts a known confusable first among distractors', () => {
    const d = pickDistractors(affect, EN_CATALOG, 1, rng())
    expect(d[0].id).toBe('en:effect')
  })
  it('prefers look-alike spellings of the same part of speech', () => {
    const verb = (lemma: string, gloss: string) => ({ ...decide, id: `en:${lemma}`, lemma, senses: [{ ...decide.senses[0], gloss }] })
    const adapt = verb('adapt', 'uyum sağlamak')
    const d = pickDistractors(adapt, [adapt, verb('adopt', 'benimsemek'), verb('swim', 'yüzmek'), verb('carry', 'taşımak')], 1, rng())
    expect(d[0].id).toBe('en:adopt')
  })
  it('always offers four meanings, even with a one-word vocabulary', () => {
    const ex = buildExercise('mc_meaning', decide, [decide], rng()) as ChoiceExercise
    expect(ex.options).toHaveLength(4)
    expect(new Set(ex.options.map((o) => o.label)).size).toBe(4)
  })
})

describe('picture exercise', () => {
  it('is offered only for words with a picture and asks for the word', () => {
    expect(exerciseTypesFor('recognition', decision)).not.toContain('picture_choice')
    const withPic = { ...decision, imageId: 'img1' }
    expect(exerciseTypesFor('recognition', withPic)).toContain('picture_choice')
    const ex = buildExercise('picture_choice', withPic, CATALOG, rng()) as ChoiceExercise
    expect(ex.imageId).toBe('img1')
    expect(ex.options.find((o) => o.id === ex.correctOptionId)!.label).toBe('decision')
    expect(ex.options.length).toBeGreaterThanOrEqual(3)
  })
})
