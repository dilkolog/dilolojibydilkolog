import { beforeAll, describe, expect, it } from 'vitest'
import '../conjugationData'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import { addTenses, conjugateTense } from '../tenses'
import { FAMILIES, FAMILY_ORDER, familyVerbs, verbFamilies } from '../verbFamilies'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

describe('Spanish families', () => {
  it('stem-changing verbs', () => {
    for (const v of ['pensar', 'querer', 'empezar', 'entender', 'cerrar', 'sentir', 'preferir']) expect(verbFamilies('es', v), v).toContain('es-e-ie')
    for (const v of ['poder', 'volver', 'dormir', 'jugar', 'encontrar', 'contar']) expect(verbFamilies('es', v), v).toContain('es-o-ue')
    for (const v of ['pedir', 'seguir', 'repetir', 'servir', 'decir']) expect(verbFamilies('es', v), v).toContain('es-e-i')
  })

  it('a verb can be in two families', () => {
    expect(verbFamilies('es', 'tener')).toEqual(['es-e-ie', 'es-go'])
    expect(verbFamilies('es', 'decir')).toEqual(['es-e-i', 'es-go'])
  })

  it('yo forms and the -uir verbs', () => {
    for (const v of ['hacer', 'poner', 'salir', 'traer', 'caer']) expect(verbFamilies('es', v), v).toContain('es-go')
    for (const v of ['conocer', 'parecer', 'ofrecer']) expect(verbFamilies('es', v), v).toContain('es-zco')
    for (const v of ['construir', 'incluir', 'destruir']) expect(verbFamilies('es', v), v).toContain('es-uir')
    // seguir is a -guir verb: no y, only e → i and the g that spelling needs.
    expect(verbFamilies('es', 'seguir')).not.toContain('es-uir')
  })

  it('regular verbs and the loners', () => {
    for (const v of ['hablar', 'comer', 'vivir', 'trabajar']) expect(verbFamilies('es', v), v).toEqual(['es-regular'])
    for (const v of ['ser', 'ir', 'dar', 'estar']) expect(verbFamilies('es', v), v).toContain('es-other')
  })

  it('a verb the tables lack has no family', () => {
    expect(verbFamilies('es', 'zzzar')).toEqual([])
  })
})

describe('French families', () => {
  it('the regular groups', () => {
    expect(verbFamilies('fr', 'parler')).toEqual(['fr-er'])
    expect(verbFamilies('fr', 'finir')).toEqual(['fr-ir-iss'])
    expect(verbFamilies('fr', 'vendre')).toEqual(['fr-re'])
    expect(verbFamilies('fr', 'partir')).toContain('fr-ir-irreg')
  })

  it('spelling changes', () => {
    expect(verbFamilies('fr', 'commencer')).toContain('fr-cer')
    expect(verbFamilies('fr', 'manger')).toContain('fr-ger')
    expect(verbFamilies('fr', 'payer')).toContain('fr-yer')
    expect(verbFamilies('fr', 'envoyer')).toContain('fr-yer')
    expect(verbFamilies('fr', 'acheter')).toContain('fr-accent')
    expect(verbFamilies('fr', 'lever')).toContain('fr-accent')
    expect(verbFamilies('fr', 'appeler')).toContain('fr-double')
    expect(verbFamilies('fr', 'jeter')).toContain('fr-double')
  })

  it('être verbs and -oir verbs', () => {
    expect(verbFamilies('fr', 'aller')).toContain('fr-etre')
    expect(verbFamilies('fr', 'venir')).toContain('fr-etre')
    expect(verbFamilies('fr', 'arriver')).toContain('fr-etre')
    expect(verbFamilies('fr', 'manger')).not.toContain('fr-etre')
    for (const v of ['pouvoir', 'vouloir', 'savoir', 'devoir']) expect(verbFamilies('fr', v), v).toContain('fr-oir')
  })
})

describe('family lists', () => {
  it('lists every verb of a family, most frequent first', () => {
    const verbs = familyVerbs('es', 'es-e-ie', new Map([['querer', 1], ['pensar', 2]]))
    expect(verbs.slice(0, 2)).toEqual(['querer', 'pensar'])
    expect(verbs.length).toBeGreaterThan(20)
  })

  it('every family has a card, and the examples show the pattern in the tables', () => {
    for (const language of ['fr', 'es'] as const) for (const id of FAMILY_ORDER[language]) expect(FAMILIES[id].language).toBe(language)
    expect(conjugateTense({ language: 'es', lemma: 'pensar', partOfSpeech: 'verb' }, 'presente')?.[1]).toBe('piensas')
  })
})
