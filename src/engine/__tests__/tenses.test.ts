import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import { addTenses, conjugateTense, irregularForms, tenseAnswers, tensesOf, tenseVariants, type Tense } from '../tenses'
import type { TargetLanguage } from '../types'

const verb = (language: TargetLanguage, lemma: string, tense: Tense) => conjugateTense({ language, lemma, partOfSpeech: 'verb' }, tense)

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

describe('French tenses', () => {
  it('imparfait and futur, regular and irregular', () => {
    expect(verb('fr', 'parler', 'imparfait')).toEqual(['parlais', 'parlais', 'parlait', 'parlions', 'parliez', 'parlaient'])
    expect(verb('fr', 'être', 'imparfait')?.[0]).toBe('étais')
    expect(verb('fr', 'aller', 'futur')).toEqual(['irai', 'iras', 'ira', 'irons', 'irez', 'iront'])
    expect(verb('fr', 'prendre', 'futur')?.[0]).toBe('prendrai')
    expect(verb('fr', 'manger', 'imparfait')?.[0]).toBe('mangeais')
  })

  it('passé composé picks the auxiliary and agrees with être', () => {
    expect(verb('fr', 'parler', 'passe-compose')).toEqual(['ai parlé', 'as parlé', 'a parlé', 'avons parlé', 'avez parlé', 'ont parlé'])
    expect(verb('fr', 'aller', 'passe-compose')).toEqual(['suis allé', 'es allé', 'est allé', 'sommes allés', 'êtes allés', 'sont allés'])
    expect(verb('fr', 'faire', 'passe-compose')?.[2]).toBe('a fait')
  })

  it('reflexive verbs take être and their pronoun', () => {
    expect(verb('fr', 'se lever', 'passe-compose')).toEqual(['me suis levé', "t'es levé", "s'est levé", 'nous sommes levés', 'vous êtes levés', 'se sont levés'])
    expect(verb('fr', 'se lever', 'futur')?.[0]).toBe('me lèverai')
    expect(verb('fr', "s'habiller", 'imparfait')?.[0]).toBe("m'habillais")
  })

  it('accepts feminine agreement and reform spellings', () => {
    const aller = { language: 'fr' as const, lemma: 'aller', partOfSpeech: 'verb' as const }
    expect(tenseAnswers(aller, 'passe-compose', 2)).toEqual(['est allé', 'est allée'])
    expect(tenseAnswers(aller, 'passe-compose', 4)).toContain('êtes allée')
    expect(tenseAnswers(aller, 'passe-compose', 5)).toContain('sont allées')
    expect(tenseVariants('fr', 'céderai')).toEqual(['cèderai'])
    expect(tenseVariants('fr', 'parlerai')).toEqual([])
  })
})

describe('Spanish tenses', () => {
  it('indefinido, imperfecto, perfecto and futuro', () => {
    expect(verb('es', 'hablar', 'preterito')).toEqual(['hablé', 'hablaste', 'habló', 'hablamos', 'hablasteis', 'hablaron'])
    expect(verb('es', 'tener', 'preterito')?.[0]).toBe('tuve')
    expect(verb('es', 'ser', 'imperfecto')).toEqual(['era', 'eras', 'era', 'éramos', 'erais', 'eran'])
    expect(verb('es', 'comer', 'imperfecto')?.[3]).toBe('comíamos')
    expect(verb('es', 'hacer', 'perfecto')?.[0]).toBe('he hecho')
    expect(verb('es', 'salir', 'futuro')?.[0]).toBe('saldré')
    expect(verb('es', 'levantarse', 'preterito')?.[2]).toBe('se levantó')
  })

  it('accepts unaccented monosyllables', () => {
    expect(tenseVariants('es', 'rió')).toEqual(['rio'])
    expect(tenseVariants('es', 'se rió')).toEqual(['se rio'])
    expect(tenseVariants('es', 'salió')).toEqual([])
  })

  it('marks irregular forms', () => {
    const v = (lemma: string) => ({ language: 'es' as const, lemma, partOfSpeech: 'verb' as const })
    expect(irregularForms(v('hablar'), 'preterito')).toEqual([false, false, false, false, false, false])
    expect(irregularForms(v('tener'), 'preterito').every(Boolean)).toBe(true)
    expect(irregularForms(v('hacer'), 'perfecto')[0]).toBe(true)
    expect(irregularForms({ language: 'fr', lemma: 'aller', partOfSpeech: 'verb' }, 'futur')[0]).toBe(true)
    expect(irregularForms({ language: 'fr', lemma: 'parler', partOfSpeech: 'verb' }, 'imparfait')[0]).toBe(false)
  })

  it('lists the tenses a verb has and none for other words', () => {
    expect(tensesOf({ language: 'es', lemma: 'hablar', partOfSpeech: 'verb' })).toEqual(['presente', 'preterito', 'perfecto', 'imperfecto', 'futuro'])
    expect(verb('es', 'mesa', 'preterito')).toBeUndefined()
    expect(conjugateTense({ language: 'es', lemma: 'hablar', partOfSpeech: 'noun' }, 'futuro')).toBeUndefined()
  })
})
