import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import { analyzeText } from '../reading'
import { addTenses } from '../tenses'
import { groupByTense, textForms, typedCompound } from '../textForms'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

const analyze = (text: string, lang: 'fr' | 'es') => analyzeText(text, lang, [], [], new Set())
const tenses = (text: string, lang: 'fr' | 'es') => textForms(lang, analyze(text, lang)).map((f) => `${f.form}|${f.lemma}|${f.tense}`)

describe('verb forms in a text', () => {
  it('finds the forms in reading order, with their verb and tense', () => {
    const found = textForms('fr', analyze('Je parle. Nous parlions hier.', 'fr'))
    expect(found).toContainEqual({ form: 'parle', lemma: 'parler', tense: 'present', sentence: 0 })
    expect(found).toContainEqual({ form: 'parlions', lemma: 'parler', tense: 'imparfait', sentence: 1 })
    expect(found.findIndex((f) => f.form === 'parle')).toBeLessThan(found.findIndex((f) => f.form === 'parlions'))
  })

  it('reads a leading imperative before an exclamation mark as an imperative', () => {
    const found = textForms('fr', analyze('Viens ici !', 'fr'))
    expect(found.some((f) => f.lemma === 'venir' && f.form === 'viens')).toBe(true)
  })

  it('reads a reflexive verb in a compound tense with its pronoun, which takes être whatever the verb is', () => {
    expect(tenses("Il s'est lavé.", 'fr')).toContain("s'est lavé|laver|passe-compose")
    expect(tenses('Je me suis levé tôt.', 'fr')).toContain('me suis levé|lever|passe-compose')
    expect(tenses('Nous nous sommes lavés.', 'fr')).toContain('nous nous sommes lavés|laver|passe-compose')
    expect(tenses("Elle ne s'était pas lavée.", 'fr')).toContain("s'était lavée|laver|plus-que-parfait")
  })

  it('does not take a lone être plus a participle of an avoir verb for a compound tense', () => {
    // "nous sommes lavés" without the second "nous" is the passive, not a reflexive passé composé.
    expect(tenses('Nous sommes lavés.', 'fr').some((f) => f.includes('passe-compose'))).toBe(false)
    expect(tenses('Il est lavé.', 'fr').some((f) => f.includes('passe-compose'))).toBe(false)
  })

  it('works in Spanish and finds nothing in a text without verbs', () => {
    expect(textForms('es', analyze('Ella habla mucho.', 'es'))).toContainEqual({ form: 'habla', lemma: 'hablar', tense: 'presente', sentence: 0 })
    expect(textForms('fr', analyze('Le chat noir.', 'fr'))).toEqual([])
  })
})

describe('compound tenses in a text', () => {
  it('reads the auxiliary and the participle as one form, not as avoir plus a stray word', () => {
    const found = tenses("J'ai mangé une pomme.", 'fr')
    expect(found).toContain('ai mangé|manger|passe-compose')
    expect(found.some((f) => f.startsWith('ai|'))).toBe(false)
  })

  it('takes être with the verbs that use it, agreeing participles included, and never with the others', () => {
    expect(tenses('Elle est allée à Paris.', 'fr')).toContain('est allée|aller|passe-compose')
    expect(tenses('Ils sont arrivés hier.', 'fr')).toContain('sont arrivés|arriver|passe-compose')
    expect(tenses('Le gâteau est mangé.', 'fr').some((f) => f.includes('passe-compose'))).toBe(false)
  })

  it('finds the other compound tenses and reaches over small words', () => {
    expect(tenses("Nous avions déjà fini quand il est venu.", 'fr')).toEqual(expect.arrayContaining(['avions fini|finir|plus-que-parfait', 'est venu|venir|passe-compose']))
    expect(tenses("Je n'ai pas mangé.", 'fr')).toContain('ai mangé|manger|passe-compose')
    expect(tenses('Elle aura fini demain.', 'fr')).toContain('aura fini|finir|futur-anterieur')
  })

  it('works in Spanish', () => {
    expect(tenses('Hemos comido mucho.', 'es')).toContain('hemos comido|comer|perfecto')
    expect(tenses('Ya había comido.', 'es')).toContain('había comido|comer|pluscuamperfecto')
    expect(tenses('No ha hablado nunca.', 'es')).toContain('ha hablado|hablar|perfecto')
  })

  it('leaves a lone participle or auxiliary alone', () => {
    expect(tenses('Un enfant mangé par le loup, ai-je dit.', 'fr').some((f) => f.includes('passe-compose'))).toBe(false)
  })
})

describe('forms grouped by tense', () => {
  const f = (form: string, lemma: string, tense: 'present' | 'imparfait', sentence = 0) => ({ form, lemma, tense, sentence })

  it('puts the busiest tense first and counts a repeated form once with its count', () => {
    const groups = groupByTense([
      f('parle', 'parler', 'present'),
      f('parlait', 'parler', 'imparfait'),
      f('parlait', 'parler', 'imparfait'),
      f('allait', 'aller', 'imparfait'),
      f('allait', 'aller', 'imparfait'),
      f('allait', 'aller', 'imparfait'),
    ])
    expect(groups.map((g) => [g.tense, g.total])).toEqual([['imparfait', 5], ['present', 1]])
    expect(groups[0].forms).toEqual([
      { form: 'allait', lemma: 'aller', count: 3, sentence: 0 },
      { form: 'parlait', lemma: 'parler', count: 2, sentence: 0 },
    ])
  })

  it('remembers the sentence each form is first met in', () => {
    const groups = groupByTense([f('parlait', 'parler', 'imparfait', 4), f('parlait', 'parler', 'imparfait', 9)])
    expect(groups[0].forms[0]).toMatchObject({ count: 2, sentence: 4 })
  })

  it('is empty for no forms', () => {
    expect(groupByTense([])).toEqual([])
  })
})

describe('where a form stands', () => {
  it('counts sentences through the whole text, across paragraphs', () => {
    const found = textForms('fr', analyze('Je parle. Il fait beau.\n\nNous parlions hier.', 'fr'))
    expect(found.find((x) => x.form === 'parle')?.sentence).toBe(0)
    expect(found.find((x) => x.form === 'parlions')?.sentence).toBe(2)
  })
})

describe('a compound tense typed into the add-word form', () => {
  const read = (language: 'fr' | 'es', typed: string) => {
    const r = typedCompound(language, typed)
    return r && `${r.lemma}|${r.tense}`
  }

  it('finds the verb and tense of a full compound form, with or without the subject', () => {
    expect(read('fr', "j'ai mangé")).toBe('manger|passe-compose')
    expect(read('fr', 'ai mangé')).toBe('manger|passe-compose')
    expect(read('fr', 'Elle est allée')).toBe('aller|passe-compose')
    expect(read('fr', 'nous avions fini')).toBe('finir|plus-que-parfait')
    expect(read('es', 'he comido')).toBe('comer|perfecto')
    expect(read('es', 'yo había hablado')).toBe('hablar|pluscuamperfecto')
  })

  it('reads a negation and a small word between, reflexive verbs and the other compound tenses', () => {
    expect(read('fr', "je n'ai pas mangé")).toBe('manger|passe-compose')
    expect(read('fr', 'ils ont déjà fini')).toBe('finir|passe-compose')
    expect(read('fr', "il s'est lavé")).toBe('laver|passe-compose')
    expect(read('fr', 'nous nous sommes levés')).toBe('lever|passe-compose')
    expect(read('fr', "j'aurai mangé")).toBe('manger|futur-anterieur')
    expect(read('fr', "j'aurais mangé")).toBe('manger|conditionnel-passe')
    expect(read('es', 'me he lavado')).toBe('lavar|perfecto')
    expect(read('es', 'no habrá terminado')).toBe('terminar|futuro-perfecto')
  })

  it('says nothing for what is no compound tense', () => {
    expect(read('fr', 'le gâteau est mangé')).toBeUndefined()
    expect(read('fr', 'la maison rouge')).toBeUndefined()
    expect(read('fr', 'avoir mangé')).toBeUndefined()
    expect(read('es', 'casa grande')).toBeUndefined()
    expect(read('fr', 'ai')).toBeUndefined()
  })
})
