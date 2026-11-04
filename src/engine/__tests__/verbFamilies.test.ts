import { beforeAll, describe, expect, it } from 'vitest'
import '../conjugationData'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import { addTenses, conjugateTense } from '../tenses'
import { FAMILIES, FAMILY_ORDER, familiesInView, familyVerbs, prefixBase, verbFamilies, weakFamilies } from '../verbFamilies'

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
    expect(verbFamilies('es', 'tener').slice(0, 2)).toEqual(['es-e-ie', 'es-go'])
    expect(verbFamilies('es', 'decir').slice(0, 2)).toEqual(['es-e-i', 'es-go'])
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

describe('families of the other tenses', () => {
  const has = (language: 'fr' | 'es', id: string, verbs: string[], yes = true) => {
    for (const v of verbs) expect(verbFamilies(language, v).includes(id as never), `${v} ${id}`).toBe(yes)
  }

  it('Spanish past: strong stems, j stems, y, -ir stem changes, yo spelling', () => {
    has('es', 'es-pret-strong', ['tener', 'estar', 'poder', 'hacer', 'querer', 'venir', 'andar'])
    has('es', 'es-pret-strong', ['fiar', 'guiar', 'hablar'], false)
    has('es', 'es-pret-j', ['decir', 'traer', 'conducir', 'producir'])
    has('es', 'es-pret-y', ['leer', 'creer', 'oír', 'construir'])
    has('es', 'es-pret-stem', ['pedir', 'sentir', 'dormir', 'preferir'])
    has('es', 'es-pret-stem', ['pensar', 'volver'], false)
    has('es', 'es-pret-spell', ['buscar', 'llegar', 'empezar'])
    has('es', 'es-pret-other', ['ser', 'ir', 'dar', 'ver'])
  })

  it('Spanish future and subjunctive', () => {
    has('es', 'es-fut-stem', ['tener', 'poner', 'salir', 'hacer', 'decir', 'saber', 'querer'])
    has('es', 'es-fut-stem', ['hablar', 'vivir', 'oír'], false)
    has('es', 'es-subj-yo', ['tener', 'hacer', 'conocer', 'decir'])
    has('es', 'es-subj-other', ['ser', 'ir', 'saber', 'estar', 'dar', 'haber'])
  })

  it('French participle, future and subjunctive', () => {
    has('fr', 'fr-pp', ['faire', 'prendre', 'voir', 'mettre', 'ouvrir', 'venir', 'avoir'])
    has('fr', 'fr-pp', ['parler', 'finir', 'vendre'], false)
    has('fr', 'fr-fut-stem', ['être', 'avoir', 'aller', 'faire', 'pouvoir', 'venir', 'voir', 'envoyer'])
    // A spelling change is not a new stem.
    has('fr', 'fr-fut-stem', ['acheter', 'appeler', 'payer', 'jeter', 'parler', 'vendre'], false)
    has('fr', 'fr-subj-stem', ['faire', 'pouvoir', 'savoir', 'aller', 'vouloir', 'être', 'avoir'])
    has('fr', 'fr-subj-stem', ['prendre', 'venir', 'finir', 'parler'], false)
  })

  it('prefixed verbs follow their irregular base', () => {
    expect(prefixBase('es', 'obtener')).toBe('tener')
    expect(prefixBase('es', 'proponer')).toBe('poner')
    expect(prefixBase('fr', 'comprendre')).toBe('prendre')
    expect(prefixBase('fr', 'devenir')).toBe('venir')
    // A base with only a spelling or stem rule is no model to name.
    expect(prefixBase('es', 'aprobar')).toBeUndefined()
    expect(prefixBase('es', 'apagar')).toBeUndefined()
    expect(prefixBase('fr', 'considérer')).toBeUndefined()
  })

  it('every family has verbs, and a verb shows its present families and the ones of the tense in view', () => {
    for (const language of ['fr', 'es'] as const) for (const id of FAMILY_ORDER[language]) expect(familyVerbs(language, id).length, id).toBeGreaterThan(2)
    expect(familiesInView('es', 'tener', 'presente')).toEqual(['es-e-ie', 'es-go', 'es-prefix'].filter((f) => verbFamilies('es', 'tener').includes(f as never)))
    expect(familiesInView('es', 'tener', 'preterito')).toContain('es-pret-strong')
    expect(familiesInView('es', 'tener', 'preterito')).not.toContain('es-fut-stem')
  })
})

describe('weak families', () => {
  const rec = (ok: number, wrong: number) => ({ ok, wrong, points: 0, card: {} as never })

  it('counts each record into the families of its tense, the worst share first', () => {
    const lab = {
      records: {
        'tener|preterito': rec(1, 4),
        'hacer|preterito': rec(2, 2),
        'pensar|presente': rec(5, 1),
        'querer|presente': rec(2, 0),
        'hablar|presente': rec(0, 9),
      },
      slips: {},
    }
    const weak = weakFamilies('es', lab)
    expect(weak[0].id).toBe('es-pret-strong')
    expect(weak[0].wrong).toBe(6)
    expect(weak[0].missed[0]).toBe('tener')
    // e → ie: 1 wrong in 8 answers is not weak; the regular verbs are never a "pattern" to drill.
    expect(weak.map((w) => w.id)).not.toContain('es-e-ie')
    expect(weak.map((w) => w.id)).not.toContain('es-regular')
  })

  it('needs enough answers', () => {
    expect(weakFamilies('es', { records: { 'tener|preterito': rec(0, 2) }, slips: {} })).toEqual([])
  })
})
