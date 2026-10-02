import { describe, expect, it } from 'vitest'
import {
  BLANK,
  buildExercise,
  buildPretest,
  definiteArticle,
  displayForm,
  evaluateChoice,
  evaluateTyped,
  exerciseTypesFor,
  pickDistractors,
  type ChoiceExercise,
  type TypedExercise,
} from '../exercises'
import { createRng } from '../rng'
import { abandon, affect, CATALOG, decide, decision, EN_CATALOG, elAno, laDecision, lArbre } from './fixtures'

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

describe('article_choice', () => {
  it('knows the definite article from the written article or the gender', () => {
    expect(definiteArticle(laDecision)).toBe('la')
    expect(definiteArticle(lArbre)).toBe('le')
    expect(definiteArticle(elAno)).toBe('el')
    // "el agua" is feminine but takes el: the written article wins.
    expect(definiteArticle({ ...elAno, lemma: 'agua', gender: 'f', article: 'el' })).toBe('el')
  })

  it('applies only to FR/ES nouns with a known gender', () => {
    expect(exerciseTypesFor('gender', laDecision)).toEqual(['article_choice'])
    expect(exerciseTypesFor('gender', decision)).toEqual([])
    expect(exerciseTypesFor('gender', { ...laDecision, gender: 'mf', article: undefined })).toEqual([])
    expect(exerciseTypesFor('gender', { ...laDecision, partOfSpeech: 'verb' })).toEqual([])
  })

  it('asks le/la for the bare noun and marks a wrong pick as a gender error', () => {
    const ex = buildExercise('article_choice', lArbre, CATALOG, rng()) as ChoiceExercise
    expect(ex.prompt).toBe('arbre')
    expect(ex.options.map((o) => o.label)).toEqual(['le', 'la'])
    expect(evaluateChoice(ex, ex.correctOptionId).verdict).toBe('correct')
    const wrong = ex.options.find((o) => o.id !== ex.correctOptionId)!.id
    expect(evaluateChoice(ex, wrong)).toMatchObject({ verdict: 'wrong', errorType: 'gender', expected: 'le' })
  })
})

describe('buildPretest', () => {
  it('leaves out confusable words and overlapping meanings', () => {
    const glossOf = new Map(CATALOG.map((c) => [c.senses[0].gloss, c.id]))
    for (let seed = 0; seed < 20; seed++) {
      const ex = buildPretest(affect, CATALOG, createRng(seed))
      const ids = ex.options.map((o) => glossOf.get(o.label))
      expect(ids).toContain('en:affect')
      for (const r of affect.relations) expect(ids).not.toContain(r.targetId)
    }
  })
})

describe('back_translation', () => {
  it('is offered only with the AI layer and an example that has a translation', () => {
    expect(exerciseTypesFor('production', decision, { ai: true })).toContain('back_translation')
    expect(exerciseTypesFor('production', decision)).not.toContain('back_translation')
    const noTr = { ...decision, senses: [{ ...decision.senses[0], examples: decision.senses[0].examples.map((e) => ({ ...e, translation: '' })) }] }
    expect(exerciseTypesFor('production', noTr, { ai: true })).not.toContain('back_translation')
  })

  it('shows the Turkish sentence and keeps the original as reference', () => {
    const ex = buildExercise('back_translation', decision, CATALOG, rng()) as TypedExercise
    const original = decision.senses[0].examples.find((e) => e.text === ex.accepted[0])!
    expect(ex.prompt).toBe(original.translation)
    expect(ex.hints[0]).toContain('decision')
  })
})

describe('idiom_complete', () => {
  it('blanks the particle of a phrasal verb and offers other particles', async () => {
    const { createEntry } = await import('../../data/wordInput')
    const { idiomGap } = await import('../exercises')
    const give = createEntry({ word: 'give up', meaning: 'vazgeçmek', partOfSpeech: 'phrase' }, 'en', new Date())
    const gap = idiomGap(give, CATALOG, rng())
    expect(gap.words[gap.blank]).toBe('up')
    expect(gap.options).toHaveLength(3)
    expect(gap.options).not.toContain('up')
    const ex = buildExercise('idiom_complete', give, CATALOG, rng()) as ChoiceExercise
    expect(ex.prompt).toBe(`give ${BLANK}`)
    expect(ex.options.find((o) => o.id === ex.correctOptionId)?.label).toBe('up')
  })

  it('blanks the longest word of other idioms and applies only to multi-word phrases', async () => {
    const { createEntry } = await import('../../data/wordInput')
    const { idiomGap } = await import('../exercises')
    const cafard = createEntry({ word: 'avoir le cafard', meaning: 'morali bozuk olmak', partOfSpeech: 'phrase' }, 'fr', new Date())
    expect(idiomGap(cafard, CATALOG, rng()).blank).toBe(2)
    expect(exerciseTypesFor('collocation', cafard)).toContain('idiom_complete')
    expect(exerciseTypesFor('collocation', decision)).not.toContain('idiom_complete')
  })
})
