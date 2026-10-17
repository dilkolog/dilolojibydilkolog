import { describe, expect, it } from 'vitest'
import {
  CHECK_SIZE,
  checkableTopics,
  checkFor,
  englishTenseLessons,
  lessonFor,
  lessonTense,
  lessonTitle,
  lessonsOf,
  practiceTopic,
  TRY_SIZE,
  tryFor,
} from './lessonOf'

describe('lessonOf utilities', () => {
  it('retrieves lessons by language', () => {
    const fr = lessonsOf('fr')
    const es = lessonsOf('es')
    const en = lessonsOf('en')

    expect(fr.length).toBeGreaterThan(15)
    expect(es.length).toBeGreaterThan(15)
    expect(en.length).toBeGreaterThan(15)
    expect(fr.every((l) => l.language === 'fr')).toBe(true)
    expect(es.every((l) => l.language === 'es')).toBe(true)
    expect(en.every((l) => l.language === 'en')).toBe(true)
  })

  it('finds lesson by topic or practice alias', () => {
    const subjonctif = lessonFor('fr', 'subjonctif')
    expect(subjonctif).toBeDefined()
    expect(subjonctif?.title).toBe('Subjonctif')

    const unknown = lessonFor('fr', 'non_existing_topic_xyz')
    expect(unknown).toBeUndefined()
  })

  it('computes lesson title appropriately', () => {
    const basicLesson = lessonFor('fr', 'basics_fr_articles')
    expect(basicLesson).toBeDefined()
    expect(lessonTitle(basicLesson!)).toBe('Artikeller ve cinsiyet')

    const grammarLesson = lessonFor('en', 'reported_speech')
    expect(grammarLesson).toBeDefined()
    expect(lessonTitle(grammarLesson!).length).toBeGreaterThan(0)
  })

  it('resolves practice topic with fallback to topic', () => {
    const lesson = lessonFor('es', 'subjuntivo')
    expect(lesson).toBeDefined()
    expect(practiceTopic(lesson!)).toBe(lesson!.practice ?? lesson!.topic)
  })

  it('maps French and Spanish verb lessons to their verb-lab tense', () => {
    expect(lessonTense(lessonFor('fr', 'subjonctif')!)).toBe('subjonctif')
    expect(lessonTense(lessonFor('fr', 'basics_fr_passe_compose')!)).toBe('passe-compose')
    expect(lessonTense(lessonFor('es', 'imperativo_es')!)).toBe('imperativo')
    expect(lessonTense(lessonFor('es', 'basics_es_pluscuamperfecto')!)).toBe('pluscuamperfecto')
    expect(lessonTense(lessonFor('fr', 'basics_fr_articles')!)).toBeUndefined()
    expect(lessonTense(lessonFor('en', 'present_perfect')!)).toBeUndefined()
  })

  it('returns english tense lessons in chronological order', () => {
    const tenses = englishTenseLessons()
    expect(tenses.length).toBeGreaterThan(8)
    expect(tenses[0].topic).toBe('basics_en_present_simple')
    expect(tenses.every((l) => l.language === 'en')).toBe(true)
  })

  it('generates check questions for lessons using checkFor', () => {
    const lesson = lessonFor('fr', 'subjonctif')
    expect(lesson).toBeDefined()

    const check = checkFor(lesson!, () => 0.4)
    expect(check.length).toBeLessThanOrEqual(CHECK_SIZE)
    if (check.length > 0) {
      expect(check[0].prompt.length).toBeGreaterThan(0)
      expect(check[0].options.length).toBeGreaterThanOrEqual(3)
      expect(check[0].answer).toBeGreaterThanOrEqual(0)
      expect(check[0].answer).toBeLessThan(check[0].options.length)
    }
  })

  it('lists checkable topics per language', () => {
    const topicsFr = checkableTopics('fr')
    expect(topicsFr.length).toBeGreaterThan(10)
    expect(topicsFr).toContain('basics_fr_articles')

    const topicsEs = checkableTopics('es')
    expect(topicsEs.length).toBeGreaterThan(10)
    expect(topicsEs).toContain('basics_es_articulos')
  })

  it('offers questions to try on the spot that the check does not ask, and none when the lesson has only its own check', () => {
    const lesson = lessonFor('fr', 'subjonctif')!
    const check = checkFor(lesson)
    const tried = tryFor(lesson, check)
    expect(tried.length).toBeGreaterThan(0)
    expect(tried.length).toBeLessThanOrEqual(TRY_SIZE)
    const asked = new Set(check.map((c) => c.prompt))
    expect(tried.every((t) => !asked.has(t.prompt))).toBe(true)
    expect(tried.every((t) => t.options[t.answer] !== undefined)).toBe(true)
    // A lesson with only its own three questions has none to spare; one with extra questions in its pool tries those.
    const basic = lessonFor('fr', 'basics_fr_passe_simple')!
    expect(tryFor(basic, checkFor(basic))).toEqual([])
    const grown = lessonFor('fr', 'basics_fr_articles')!
    const drawn = checkFor(grown)
    const spare = tryFor(grown, drawn)
    expect(spare).toHaveLength(TRY_SIZE)
    expect(spare.every((t) => !drawn.some((d) => d.prompt === t.prompt))).toBe(true)
  })
})
