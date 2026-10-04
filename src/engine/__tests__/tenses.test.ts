import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import sentences from '../../data/tenses/es-sentences.json'
import { addTenseSentences, addTenses, conjugateTense, tenseSentence, irregularForms, tenseAnswers, tensesOf, tenseVariants, type Tense } from '../tenses'
import { BLANK, buildExercise, evaluateTyped, type TypedExercise } from '../exercises'
import { createRng } from '../rng'
import type { TargetLanguage, VocabularyEntry } from '../types'
import { elAno } from './fixtures'

const verb = (language: TargetLanguage, lemma: string, tense: Tense) => conjugateTense({ language, lemma, partOfSpeech: 'verb' }, tense)

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
  addTenseSentences(sentences as Record<string, Record<string, string>>)
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

describe('Spanish example sentences', () => {
  it('every stored form is the verb in that tense', () => {
    let n = 0
    for (const [lemma, row] of Object.entries(sentences as Record<string, Record<string, string>>)) {
      for (const tense of Object.keys(row) as Tense[]) {
        const s = tenseSentence({ language: 'es', lemma }, tense)!
        expect(s.text).toContain('___')
        expect(verb('es', lemma, tense)!.map((f) => f.toLowerCase())).toContain(s.form.toLowerCase())
        n++
      }
    }
    expect(n).toBeGreaterThan(3000)
  })

  it('gives the sentence with the form blanked out', () => {
    const s = tenseSentence({ language: 'es', lemma: 'borrar' }, 'futuro')
    expect(s?.form).toBe('borraré')
    expect(s?.text).toMatch(/^Mañana ___ /)
    expect(s?.translation).toContain('sileceğim')
    expect(tenseSentence({ language: 'fr', lemma: 'parler' }, 'futur')).toBeUndefined()
  })
})

describe('conjugation questions', () => {
  const borrar: VocabularyEntry = { ...elAno, id: 'es:borrar', lemma: 'borrar', partOfSpeech: 'verb', article: undefined, gender: undefined, senses: [{ ...elAno.senses[0], gloss: 'silmek', examples: [] }] }

  it('asks only the present for a new word, and opens tenses as it is produced', () => {
    const seen = (reps: number) => new Set(Array.from({ length: 60 }, (_, i) => buildExercise('conjugation', borrar, [borrar], createRng(i), { productionReps: reps }).tense))
    expect([...seen(0)]).toEqual(['presente'])
    expect(seen(1)).toEqual(new Set(['presente', 'preterito']))
    expect(seen(5).size).toBe(5)
  })

  it('asks in a sentence when one exists, and grades the form in it', () => {
    const all = Array.from({ length: 80 }, (_, i) => buildExercise('conjugation', borrar, [borrar], createRng(i), { productionReps: 5 }) as TypedExercise)
    const inSentence = all.find((e) => e.tense === 'futuro' && e.context?.includes(BLANK))!
    expect(inSentence.accepted[0]).toBe('borraré')
    expect(inSentence.contextTranslation).toContain('sileceğim')
    expect(evaluateTyped(inSentence, 'borraré', borrar, [borrar]).verdict).toBe('correct')
    // Another tense's form of the same verb is a form error, not a meaning error.
    expect(evaluateTyped(inSentence, 'borré', borrar, [borrar]).errorType).toBe('form')
    expect(all.some((e) => !e.context?.includes(BLANK))).toBe(true)
  })
})
