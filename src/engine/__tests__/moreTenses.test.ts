import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import { addTenses, analyzeImperative, sentenceImperative, answersFor, personsOf, subjectLabel, withSubject, conjugateTense, irregularForms, labTensesOf, tenseAnswers, tensesOf, verbParts, isCompound, isSubjunctive, type Tense } from '../tenses'
import { TENSE_BRIDGE, TENSE_GUIDE } from '../tenseGuide'
import { labForms } from '../verbLab'
import type { TargetLanguage } from '../types'

const entry = (language: TargetLanguage, lemma: string) => ({ language, lemma, partOfSpeech: 'verb' as const })
const forms = (language: TargetLanguage, lemma: string, tense: Tense) => conjugateTense(entry(language, lemma), tense)

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

describe('French passé simple', () => {
  it('the three regular sets and the irregular verbs', () => {
    expect(forms('fr', 'parler', 'passe-simple')).toEqual(['parlai', 'parlas', 'parla', 'parlâmes', 'parlâtes', 'parlèrent'])
    expect(forms('fr', 'finir', 'passe-simple')).toEqual(['finis', 'finis', 'finit', 'finîmes', 'finîtes', 'finirent'])
    expect(forms('fr', 'courir', 'passe-simple')).toEqual(['courus', 'courus', 'courut', 'courûmes', 'courûtes', 'coururent'])
    expect(forms('fr', 'être', 'passe-simple')?.[2]).toBe('fut')
    expect(forms('fr', 'avoir', 'passe-simple')?.[2]).toBe('eut')
    expect(forms('fr', 'venir', 'passe-simple')).toEqual(['vins', 'vins', 'vint', 'vînmes', 'vîntes', 'vinrent'])
    expect(forms('fr', 'naître', 'passe-simple')?.[2]).toBe('naquit')
  })

  it('takes the reflexive pronoun, and defective verbs have none', () => {
    expect(forms('fr', 'se lever', 'passe-simple')?.slice(0, 3)).toEqual(['me levai', 'te levas', 'se leva'])
    expect(forms('fr', "s'asseoir", 'passe-simple')?.[2]).toBe("s'assit")
    // traire, extraire, absoudre have no passé simple; their other tenses stay.
    expect(forms('fr', 'extraire', 'passe-simple')).toBeUndefined()
    expect(forms('fr', 'extraire', 'imparfait')?.[0]).toBe('extrayais')
    expect(labTensesOf(entry('fr', 'extraire'))).not.toContain('passe-simple')
  })

  it('is for the lab only, not the daily questions', () => {
    expect(tensesOf(entry('fr', 'parler'))).not.toContain('passe-simple')
  })
})

describe('the imperative', () => {
  const imp = (language: TargetLanguage, lemma: string) => forms(language, lemma, language === 'fr' ? 'imperatif' : 'imperativo')

  it('French: tu, nous, vous from the present, -es and vas losing the s, the four irregulars, the pronoun after', () => {
    expect(imp('fr', 'parler')).toEqual(['', 'parle', '', 'parlons', 'parlez', ''])
    expect(imp('fr', 'aller')?.[1]).toBe('va')
    expect(imp('fr', 'ouvrir')?.[1]).toBe('ouvre')
    expect(imp('fr', 'finir')?.[1]).toBe('finis')
    expect(imp('fr', 'prendre')?.[1]).toBe('prends')
    expect(imp('fr', 'être')).toEqual(['', 'sois', '', 'soyons', 'soyez', ''])
    expect(imp('fr', 'avoir')?.[1]).toBe('aie')
    expect(imp('fr', 'se lever')).toEqual(['', 'lève-toi', '', 'levons-nous', 'levez-vous', ''])
  })

  it('Spanish: tú from the present or its short forms, usted/nosotros/ustedes from the subjunctive, vosotros -d', () => {
    expect(imp('es', 'hablar')).toEqual(['', 'habla', 'hable', 'hablemos', 'hablad', 'hablen'])
    expect(imp('es', 'comer')).toEqual(['', 'come', 'coma', 'comamos', 'comed', 'coman'])
    expect(imp('es', 'tener')?.slice(1, 3)).toEqual(['ten', 'tenga'])
    expect(imp('es', 'decir')?.[1]).toBe('di')
    expect(imp('es', 'hacer')?.[1]).toBe('haz')
    expect(imp('es', 'ir')).toEqual(['', 've', 'vaya', 'vamos', 'id', 'vayan'])
    expect(imp('es', 'obtener')?.[1]).toBe('obtén')
    // The stress mark of a Spanish reflexive moves (levántate): not built.
    expect(imp('es', 'levantarse')).toBeUndefined()
  })

  it('has only the persons it speaks to, no subject in the answer, and its own way of showing them', () => {
    expect(personsOf('fr', 'imperatif')).toEqual([1, 3, 4])
    expect(personsOf('es', 'imperativo')).toEqual([1, 2, 3, 4, 5])
    expect(personsOf('fr', 'present')).toEqual([0, 1, 2, 3, 4, 5])
    expect(answersFor(entry('fr', 'parler'), 'imperatif', 1)).toEqual(['parle'])
    expect(subjectLabel('fr', 'imperatif', 3)).toBe('(nous)')
    expect(subjectLabel('es', 'imperativo', 2)).toBe('(usted)')
    expect(withSubject('es', 'imperativo', 1, 'habla')).toBe('¡habla!')
    expect(withSubject('fr', 'imperatif', 1, 'parle')).toBe('parle !')
    // Lab only.
    expect(tensesOf(entry('fr', 'parler'))).not.toContain('imperatif')
  })

  it('marks the irregular imperatives', () => {
    expect(irregularForms(entry('fr', 'être'), 'imperatif')).toEqual([false, true, false, true, true, false])
    expect(irregularForms(entry('fr', 'parler'), 'imperatif').some(Boolean)).toBe(false)
    expect(irregularForms(entry('es', 'tener'), 'imperativo')).toEqual([false, true, false, false, false, false])
    expect(irregularForms(entry('es', 'ir'), 'imperativo')).toEqual([false, true, false, true, false, false])
    expect(irregularForms(entry('es', 'hablar'), 'imperativo').some(Boolean)).toBe(false)
  })

  it('says the negative its own way: no + subjunctive in Spanish, the pronoun back in front in French', () => {
    expect(labForms(entry('es', 'hablar'), 'imperativo', { negative: true })).toEqual(['', 'no hables', 'no hable', 'no hablemos', 'no habléis', 'no hablen'])
    expect(labForms(entry('es', 'levantar'), 'imperativo', { negative: true, reflexive: true })?.[1]).toBe('no te levantes')
    expect(labForms(entry('fr', 'parler'), 'imperatif', { negative: true })).toEqual(['', 'ne parle pas', '', 'ne parlons pas', 'ne parlez pas', ''])
    expect(labForms(entry('fr', 'aller'), 'imperatif', { negative: true })?.[1]).toBe("ne va pas")
    expect(labForms(entry('fr', 'lever'), 'imperatif', { negative: true, reflexive: true })).toEqual(['', 'ne te lève pas', '', 'ne nous levons pas', 'ne vous levez pas', ''])
    expect(labForms(entry('fr', 'habiller'), 'imperatif', { negative: true, reflexive: true })?.[1]).toBe("ne t'habille pas")
  })
})

describe('imperatives in a text', () => {
  it('knows a word as some verb\'s imperative', () => {
    expect(analyzeImperative('fr', 'viens')[0]).toMatchObject({ lemma: 'venir', tense: 'imperatif', persons: [1] })
    expect(analyzeImperative('fr', 'écoutez')[0]?.lemma).toBe('écouter')
    expect(analyzeImperative('es', 'ven')[0]).toMatchObject({ lemma: 'venir', tense: 'imperativo' })
    expect(analyzeImperative('es', 'hablad')[0]?.lemma).toBe('hablar')
    expect(analyzeImperative('fr', 'maison')).toEqual([])
  })

  it('reads a sentence as an imperative only when it starts with one and ends with "!"', () => {
    expect(sentenceImperative('fr', 'Viens ici !')).toMatchObject({ form: 'viens', analysis: { lemma: 'venir' } })
    expect(sentenceImperative('fr', '« Écoutez-moi bien ! »')?.analysis.lemma).toBe('écouter')
    expect(sentenceImperative('es', '¡Ven aquí!')?.analysis.lemma).toBe('venir')
    expect(sentenceImperative('fr', 'Il parle !')).toBeUndefined()
    expect(sentenceImperative('fr', 'Parle plus fort.')).toBeUndefined()
  })
})

describe('Spanish compound tenses', () => {
  it('pluscuamperfecto, futuro perfecto, condicional perfecto', () => {
    expect(forms('es', 'comer', 'pluscuamperfecto')).toEqual(['había comido', 'habías comido', 'había comido', 'habíamos comido', 'habíais comido', 'habían comido'])
    expect(forms('es', 'hacer', 'futuro-perfecto')?.[0]).toBe('habré hecho')
    expect(forms('es', 'ir', 'condicional-perfecto')?.[3]).toBe('habríamos ido')
  })

  it('perfect and pluperfect subjunctive', () => {
    expect(forms('es', 'comer', 'subjuntivo-perfecto')).toEqual(['haya comido', 'hayas comido', 'haya comido', 'hayamos comido', 'hayáis comido', 'hayan comido'])
    expect(forms('es', 'comer', 'subjuntivo-pluscuamperfecto')).toEqual(['hubiera comido', 'hubieras comido', 'hubiera comido', 'hubiéramos comido', 'hubierais comido', 'hubieran comido'])
  })

  it('reflexive verbs keep their pronoun in front of the auxiliary', () => {
    expect(forms('es', 'levantarse', 'pluscuamperfecto')?.[0]).toBe('me había levantado')
    expect(forms('es', 'levantarse', 'subjuntivo-imperfecto')?.[3]).toBe('nos levantáramos')
  })
})

describe('Spanish imperfect subjunctive', () => {
  it('is built from the preterite "ellos" form, with the accent in nosotros', () => {
    expect(forms('es', 'comer', 'subjuntivo-imperfecto')).toEqual(['comiera', 'comieras', 'comiera', 'comiéramos', 'comierais', 'comieran'])
    expect(forms('es', 'hablar', 'subjuntivo-imperfecto')?.[3]).toBe('habláramos')
    expect(forms('es', 'tener', 'subjuntivo-imperfecto')?.slice(0, 4)).toEqual(['tuviera', 'tuvieras', 'tuviera', 'tuviéramos'])
    expect(forms('es', 'ir', 'subjuntivo-imperfecto')?.[0]).toBe('fuera')
    expect(forms('es', 'decir', 'subjuntivo-imperfecto')?.[3]).toBe('dijéramos')
    expect(forms('es', 'leer', 'subjuntivo-imperfecto')?.[3]).toBe('leyéramos')
    expect(forms('es', 'dormir', 'subjuntivo-imperfecto')?.[2]).toBe('durmiera')
  })

  it('also accepts the -se forms', () => {
    const comer = entry('es', 'comer')
    expect(tenseAnswers(comer, 'subjuntivo-imperfecto', 0)).toEqual(['comiera', 'comiese'])
    expect(tenseAnswers(comer, 'subjuntivo-imperfecto', 3)).toContain('comiésemos')
    expect(tenseAnswers(comer, 'subjuntivo-imperfecto', 4)).toContain('comieseis')
    expect(tenseAnswers(comer, 'subjuntivo-pluscuamperfecto', 0)).toContain('hubiese comido')
    expect(tenseAnswers(comer, 'subjuntivo-pluscuamperfecto', 3)).toContain('hubiésemos comido')
  })

  it('marks the tense irregular only where the preterite is', () => {
    expect(irregularForms(entry('es', 'comer'), 'subjuntivo-imperfecto').some(Boolean)).toBe(false)
    expect(irregularForms(entry('es', 'tener'), 'subjuntivo-imperfecto').every(Boolean)).toBe(true)
  })
})

describe('French compound tenses', () => {
  it('plus-que-parfait, futur antérieur, conditionnel passé, subjonctif passé', () => {
    expect(forms('fr', 'parler', 'plus-que-parfait')).toEqual(['avais parlé', 'avais parlé', 'avait parlé', 'avions parlé', 'aviez parlé', 'avaient parlé'])
    expect(forms('fr', 'aller', 'plus-que-parfait')?.slice(2)).toEqual(['était allé', 'étions allés', 'étiez allés', 'étaient allés'])
    expect(forms('fr', 'finir', 'futur-anterieur')?.[0]).toBe('aurai fini')
    expect(forms('fr', 'venir', 'conditionnel-passe')?.[0]).toBe('serais venu')
    expect(forms('fr', 'parler', 'subjonctif-passe')?.[0]).toBe('aie parlé')
    expect(forms('fr', 'partir', 'subjonctif-passe')?.[2]).toBe('soit parti')
  })

  it('reflexive verbs take être and their pronoun, and the participle agrees', () => {
    expect(forms('fr', 'se lever', 'plus-que-parfait')?.slice(0, 3)).toEqual(["m'étais levé", "t'étais levé", "s'était levé"])
    const aller = entry('fr', 'aller')
    expect(tenseAnswers(aller, 'plus-que-parfait', 2)).toEqual(['était allé', 'était allée'])
    expect(tenseAnswers(aller, 'futur-anterieur', 5)).toContain('seront allées')
  })

  it('marks an irregular participle in every compound tense', () => {
    expect(irregularForms(entry('fr', 'parler'), 'plus-que-parfait').some(Boolean)).toBe(false)
    expect(irregularForms(entry('fr', 'prendre'), 'futur-anterieur').every(Boolean)).toBe(true)
  })
})

describe('the tense lists', () => {
  it('the lab knows more tenses than the questions ask', () => {
    expect(labTensesOf(entry('es', 'comer')).length).toBeGreaterThan(tensesOf(entry('es', 'comer')).length)
    expect(tensesOf(entry('es', 'comer'))).not.toContain('pluscuamperfecto')
    expect(labTensesOf(entry('fr', 'parler'))).toEqual(['present', 'imparfait', 'passe-compose', 'passe-simple', 'plus-que-parfait', 'futur', 'futur-anterieur', 'conditionnel', 'conditionnel-passe', 'subjonctif', 'subjonctif-passe', 'imperatif'])
  })

  it('every lab tense has a guide, and the flags follow the name', () => {
    for (const language of ['fr', 'es'] as const)
      for (const t of labTensesOf(entry(language, language === 'fr' ? 'parler' : 'hablar'))) {
        expect(TENSE_GUIDE[t].short.length).toBeGreaterThan(20)
        expect(TENSE_GUIDE[t].examples).toHaveLength(2)
      }
    // Every tense is seen from Turkish too.
    for (const language of ['fr', 'es'] as const)
      for (const t of labTensesOf(entry(language, language === 'fr' ? 'parler' : 'hablar'))) {
        expect(TENSE_BRIDGE[t].suffix.length).toBeGreaterThan(3)
        expect(TENSE_BRIDGE[t].note.length).toBeGreaterThan(30)
      }
    expect(isSubjunctive('subjuntivo-imperfecto')).toBe(true)
    expect(isSubjunctive('futuro-perfecto')).toBe(false)
    expect(isCompound('pluscuamperfecto')).toBe(true)
    expect(isCompound('preterito')).toBe(false)
  })
})

describe('verb parts', () => {
  it('Spanish gerunds, including the ones the stem changes', () => {
    const g = (v: string) => verbParts(entry('es', v))?.gerund
    expect(g('hablar')).toBe('hablando')
    expect(g('comer')).toBe('comiendo')
    expect(g('vivir')).toBe('viviendo')
    expect(g('leer')).toBe('leyendo')
    expect(g('caer')).toBe('cayendo')
    expect(g('ir')).toBe('yendo')
    expect(g('ser')).toBe('siendo')
    expect(g('ver')).toBe('viendo')
    expect(g('pedir')).toBe('pidiendo')
    expect(g('dormir')).toBe('durmiendo')
    expect(g('morir')).toBe('muriendo')
    expect(g('sentir')).toBe('sintiendo')
    expect(g('seguir')).toBe('siguiendo')
    expect(g('decir')).toBe('diciendo')
    expect(g('poder')).toBe('pudiendo')
    expect(g('venir')).toBe('viniendo')
    expect(g('tener')).toBe('teniendo')
    expect(g('reír')).toBe('riendo')
    expect(g('oír')).toBe('oyendo')
    expect(g('construir')).toBe('construyendo')
    expect(g('traer')).toBe('trayendo')
    expect(g('repetir')).toBe('repitiendo')
    expect(g('elegir')).toBe('eligiendo')
  })

  it('French participles and the part of the verb that is irregular', () => {
    const p = (v: string) => verbParts(entry('fr', v))
    expect(p('parler')).toMatchObject({ gerund: 'parlant', participle: 'parlé', irregular: false })
    expect(p('manger')?.gerund).toBe('mangeant')
    expect(p('finir')?.gerund).toBe('finissant')
    expect(p('être')).toMatchObject({ gerund: 'étant', participle: 'été', irregular: true })
    expect(p('avoir')?.gerund).toBe('ayant')
    expect(p('savoir')?.gerund).toBe('sachant')
    expect(p('prendre')).toMatchObject({ gerund: 'prenant', participle: 'pris' })
    expect(verbParts(entry('es', 'hablar'))?.irregular).toBe(false)
    expect(verbParts(entry('es', 'tener'))?.irregular).toBe(true)
  })

  it('has nothing for a word that is not a verb in the tables', () => {
    expect(verbParts({ language: 'es', lemma: 'casa', partOfSpeech: 'noun' })).toBeUndefined()
    expect(verbParts(entry('es', 'zzzar'))).toBeUndefined()
  })
})
