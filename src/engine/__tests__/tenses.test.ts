import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import sentences from '../../data/tenses/es-sentences.json'
import frSentences from '../../data/tenses/fr-sentences.json'
import frAspect from '../../data/tenses/fr-aspect.json'
import esAspect from '../../data/tenses/es-aspect.json'
import { addAspect, aspectItems, tenseOfForm, tenseStats, addTenseSentences, addTenses, answersFor, conjugateTense, subjectLabel, tenseSentence, withSubject, irregularForms, tenseAnswers, tensesOf, tenseVariants, type Tense } from '../tenses'
import { BLANK, buildExercise, evaluateTyped, type TypedExercise } from '../exercises'
import { createRng } from '../rng'
import type { TargetLanguage, VocabularyEntry } from '../types'
import { elAno } from './fixtures'

const verb = (language: TargetLanguage, lemma: string, tense: Tense) => conjugateTense({ language, lemma, partOfSpeech: 'verb' }, tense)

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
  addTenseSentences('es', sentences as Record<string, Record<string, string>>)
  addTenseSentences('fr', frSentences as Record<string, Record<string, string>>)
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
    expect(tensesOf({ language: 'es', lemma: 'hablar', partOfSpeech: 'verb' })).toEqual(['presente', 'preterito', 'perfecto', 'imperfecto', 'futuro', 'condicional', 'subjuntivo'])
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
    expect(tenseSentence({ language: 'en', lemma: 'talk' }, 'futur')).toBeUndefined()
  })
})

describe('conjugation questions', () => {
  const borrar: VocabularyEntry = { ...elAno, id: 'es:borrar', lemma: 'borrar', partOfSpeech: 'verb', article: undefined, gender: undefined, senses: [{ ...elAno.senses[0], gloss: 'silmek', examples: [] }] }

  it('asks only the present for a new word, and opens tenses as it is produced', () => {
    const seen = (reps: number) => new Set(Array.from({ length: 60 }, (_, i) => buildExercise('conjugation', borrar, [borrar], createRng(i), { productionReps: reps }).tense))
    expect([...seen(0)]).toEqual(['presente'])
    expect(seen(1)).toEqual(new Set(['presente', 'preterito']))
    expect(seen(5).size).toBe(5)
    expect(seen(8).size).toBe(7)
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

describe('French example sentences (Tatoeba)', () => {
  it('every stored form is the verb in that tense, never the present', () => {
    let n = 0
    for (const [lemma, row] of Object.entries(frSentences as Record<string, Record<string, string>>)) {
      for (const tense of Object.keys(row) as Tense[]) {
        const s = tenseSentence({ language: 'fr', lemma }, tense)!
        expect(tense).not.toBe('present')
        const answers = [0, 1, 2, 3, 4, 5].flatMap((p) => answersFor({ language: 'fr', lemma, partOfSpeech: 'verb' }, tense, p))
        expect(answers).toContain(s.form.toLocaleLowerCase('fr'))
        n++
      }
    }
    expect(n).toBeGreaterThan(4000)
  })

  it('keeps a translation only when its tense fits', () => {
    expect(tenseSentence({ language: 'fr', lemma: 'savoir' }, 'futur')).toMatchObject({ form: 'sauras', translation: 'Gelecek yıl kayakta iyi olacaksın.' })
    expect(tenseSentence({ language: 'fr', lemma: 'savoir' }, 'passe-compose')?.translation).toBeUndefined()
  })
})

describe('conditional and subjunctive', () => {
  it('French conditionnel from the futur stem, subjonctif from the table', () => {
    expect(verb('fr', 'parler', 'conditionnel')).toEqual(['parlerais', 'parlerais', 'parlerait', 'parlerions', 'parleriez', 'parleraient'])
    expect(verb('fr', 'être', 'conditionnel')?.[0]).toBe('serais')
    expect(verb('fr', 'avoir', 'subjonctif')).toEqual(['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient'])
    expect(verb('fr', 'boire', 'subjonctif')).toEqual(['boive', 'boives', 'boive', 'buvions', 'buviez', 'boivent'])
    expect(verb('fr', 'finir', 'subjonctif')?.[0]).toBe('finisse')
    expect(verb('fr', 'se lever', 'subjonctif')?.[0]).toBe('me lève')
  })

  it('Spanish condicional and subjuntivo', () => {
    expect(verb('es', 'tener', 'condicional')).toEqual(['tendría', 'tendrías', 'tendría', 'tendríamos', 'tendríais', 'tendrían'])
    expect(verb('es', 'hablar', 'subjuntivo')).toEqual(['hable', 'hables', 'hable', 'hablemos', 'habléis', 'hablen'])
    expect(verb('es', 'tener', 'subjuntivo')?.[0]).toBe('tenga')
    expect(verb('es', 'pedir', 'subjuntivo')?.[3]).toBe('pidamos')
    expect(verb('es', 'ser', 'subjuntivo')?.[0]).toBe('sea')
  })

  it('the subjunctive is asked and accepted with "que"', () => {
    expect(subjectLabel('fr', 'subjonctif', 2)).toBe("qu'il / qu'elle")
    expect(subjectLabel('es', 'subjuntivo', 0)).toBe('que yo')
    expect(subjectLabel('fr', 'futur', 2)).toBe('il / elle')
    const aimer = { language: 'fr' as const, lemma: 'aimer', partOfSpeech: 'verb' as const }
    expect(answersFor(aimer, 'subjonctif', 0)).toEqual(expect.arrayContaining(['aime', "j'aime", "que j'aime"]))
    expect(answersFor(aimer, 'subjonctif', 2)).toEqual(expect.arrayContaining(['il aime', "qu'il aime", "qu'elle aime"]))
    expect(withSubject('fr', 'subjonctif', 3, 'aimions')).toBe('que nous aimions')
    expect(withSubject('es', 'futuro', 0, 'hablaré')).toBe('yo hablaré')
  })

  it('accepts reform spellings in the conditional and for -eter verbs', () => {
    expect(tenseVariants('fr', 'céderais')).toEqual(['cèderais'])
    expect(tenseVariants('fr', 'cachette', 'cacheter')).toEqual(['cachète'])
    expect(tenseVariants('fr', 'cachetterais', 'cacheter')).toEqual(['cachèterais'])
    expect(tenseVariants('fr', 'jette', 'jeter')).toEqual([])
  })

  it('marks irregular moods', () => {
    const fr = (lemma: string) => ({ language: 'fr' as const, lemma, partOfSpeech: 'verb' as const })
    const es = (lemma: string) => ({ language: 'es' as const, lemma, partOfSpeech: 'verb' as const })
    expect(irregularForms(fr('prendre'), 'subjonctif').some(Boolean)).toBe(false)
    expect(irregularForms(fr('être'), 'subjonctif').every(Boolean)).toBe(true)
    expect(irregularForms(fr('pouvoir'), 'conditionnel')[0]).toBe(true)
    expect(irregularForms(es('hablar'), 'subjuntivo').some(Boolean)).toBe(false)
    expect(irregularForms(es('tener'), 'subjuntivo').some(Boolean)).toBe(false)
    expect(irregularForms(es('ser'), 'subjuntivo')[0]).toBe(true)
    expect(irregularForms(es('salir'), 'condicional')[0]).toBe(true)
  })

  it('marks irregular present forms against the verb class', () => {
    const fr = (lemma: string) => ({ language: 'fr' as const, lemma, partOfSpeech: 'verb' as const })
    const es = (lemma: string) => ({ language: 'es' as const, lemma, partOfSpeech: 'verb' as const })
    expect(irregularForms(fr('parler'), 'present').some(Boolean)).toBe(false)
    expect(irregularForms(fr('aller'), 'present')).toEqual([true, true, true, false, false, true])
    expect(irregularForms(fr('finir'), 'present').some(Boolean)).toBe(false)
    expect(irregularForms(es('hablar'), 'presente').some(Boolean)).toBe(false)
    expect(irregularForms(es('tener'), 'presente')[0]).toBe(true)
    expect(irregularForms(es('pensar'), 'presente')).toEqual([true, true, true, false, false, true])
  })
})

describe('past tense choice items', () => {
  it('pair a form of the tense with the same person in the other tense, with a cue in the sentence', () => {
    addAspect('fr', frAspect as string[][])
    addAspect('es', esAspect as string[][])
    const pairs = { fr: ['passe-compose', 'imparfait'], es: ['preterito', 'imperfecto'] } as const
    for (const lang of ['fr', 'es'] as const) {
      const items = aspectItems(lang)
      expect(items.length).toBeGreaterThan(400)
      for (const a of items) {
        const entry = { language: lang, lemma: a.verb, partOfSpeech: 'verb' as const }
        const other = a.tense === pairs[lang][0] ? pairs[lang][1] : pairs[lang][0]
        const own = [0, 1, 2, 3, 4, 5].flatMap((p) => answersFor(entry, a.tense, p))
        expect(own).toContain(a.form.toLocaleLowerCase(lang))
        expect(conjugateTense(entry, other)).toContain(a.other)
        expect(a.text.toLocaleLowerCase(lang)).toContain(a.cue.toLocaleLowerCase(lang))
      }
    }
  })
})

describe('conjugation answers per tense', () => {
  it('finds the tense of an expected form and counts right and wrong per tense', () => {
    const aller = { language: 'fr' as const, lemma: 'aller', partOfSpeech: 'verb' as const }
    expect(tenseOfForm(aller, 'allions')).toBe('imparfait')
    expect(tenseOfForm(aller, 'nous allions')).toBe('imparfait')
    expect(tenseOfForm(aller, 'est allée')).toBe('passe-compose')
    expect(tenseOfForm(aller, 'xyz')).toBeUndefined()
    const byId = new Map([['fr:aller', aller]])
    const ev = (expected: string, correct: boolean) => ({ entryId: 'fr:aller', exerciseType: 'conjugation', expected, correct })
    const stats = tenseStats([ev('allions', false), ev('allais', true), ev('irai', true), { ...ev('va', true), exerciseType: 'mc_meaning' }], byId)
    expect(stats).toEqual(expect.arrayContaining([{ tense: 'imparfait', correct: 1, wrong: 1 }, { tense: 'futur', correct: 1, wrong: 0 }]))
    expect(stats).toHaveLength(2)
  })
})

describe('naming a wrong conjugation', () => {
  it('says which tense or person the answer was', async () => {
    const { formFeedback } = await import('../tenseGuide')
    const aller = { language: 'fr' as const, lemma: 'aller', partOfSpeech: 'verb' as const }
    expect(formFeedback(aller, 'passe-compose', 'allais')).toMatch(/^“allais” imparfait biçimi; burada passé composé isteniyor/)
    expect(formFeedback(aller, 'imparfait', 'allions')).toBe('Zaman doğru, kişi değil: “allions” nous için.')
    expect(formFeedback(aller, 'futur', 'xyz')).toBeUndefined()
  })
})

describe('reading a conjugated form', () => {
  it('finds the verb, tense and persons of a form met in a text', async () => {
    const { analyzeForm } = await import('../tenses')
    expect(analyzeForm('fr', 'allions')).toEqual(expect.arrayContaining([{ lemma: 'aller', tense: 'imparfait', persons: [3] }]))
    expect(analyzeForm('fr', 'Retournerai')).toEqual([{ lemma: 'retourner', tense: 'futur', persons: [0] }])
    expect(analyzeForm('es', 'tuve')).toEqual([{ lemma: 'tener', tense: 'preterito', persons: [0] }])
    expect(analyzeForm('fr', 'aller')).toEqual([])
    expect(analyzeForm('en', 'went')).toEqual([])
  })
})

describe('past tense choice in sessions', () => {
  it('asks which past fits, two options, and falls back before the first production', async () => {
    const { buildExercise, evaluateChoice, BLANK } = await import('../exercises')
    addAspect('fr', frAspect as string[][])
    const verbEntry: VocabularyEntry = { ...elAno, id: 'fr:aller', language: 'fr', lemma: 'aller', partOfSpeech: 'verb', article: undefined, gender: undefined, senses: [{ ...elAno.senses[0], gloss: 'gitmek', examples: [] }] }
    const ex = buildExercise('aspect_choice', verbEntry, [verbEntry], createRng(3), { productionReps: 2 })
    expect(ex.kind).toBe('choice')
    if (ex.kind !== 'choice') return
    expect(ex.options).toHaveLength(2)
    expect(ex.context).toContain(BLANK)
    expect(ex.cue).toBeTruthy()
    const wrong = ex.options.find((o) => o.id !== ex.correctOptionId)!
    expect(evaluateChoice(ex, wrong.id).errorType).toBe('form')
    expect(buildExercise('aspect_choice', verbEntry, [verbEntry], createRng(3), { productionReps: 0 }).type).toBe('conjugation')
  })
})
