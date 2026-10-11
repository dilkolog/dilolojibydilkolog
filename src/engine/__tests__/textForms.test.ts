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
    const found = tenses('Un enfant mangé par le loup, ai-je dit.', 'fr')
    // "mangé" alone is no compound; "ai-je dit" is an inverted passé composé of dire.
    expect(found.some((f) => f.includes('manger') && f.includes('passe-compose'))).toBe(false)
    expect(found).toContain('ai-je dit|dire|passe-compose')
  })
})

describe('compound tenses the audit found missing or wrong', () => {
  it('"ne … plus" is the adverb, not the participle of plaire', () => {
    const found = tenses("Les Mauritaniens n'ont plus de gouvernement. Je n'ai plus qu'à partir.", 'fr')
    expect(found.some((f) => f.includes('plaire'))).toBe(false)
    // The real participle still works: "a plu" (it pleased / it rained).
    expect(tenses("Ce film m'a plu.", 'fr')).toContain("m'a plu|plaire|passe-compose")
  })

  it('reads an adverb in -ment between the auxiliary and the participle', () => {
    expect(tenses('Elle a vraiment aimé cette pièce. Nous avons enfin trouvé une solution.', 'fr')).toEqual(expect.arrayContaining(['a aimé|aimer|passe-compose', 'avons trouvé|trouver|passe-compose']))
    expect(tenses('Ella había completamente olvidado la cita.', 'es')).toContain('había olvidado|olvidar|pluscuamperfecto')
  })

  it('reads an inverted question ("a-t-il compris", "avez-vous répondu", "sont-ils allés")', () => {
    const found = tenses("A-t-il compris la gravité ? Pourquoi n'avez-vous pas répondu ? Où sont-ils allés ?", 'fr')
    expect(found).toEqual(expect.arrayContaining(['a-t-il compris|comprendre|passe-compose', 'avez-vous répondu|répondre|passe-compose', 'sont-ils allés|aller|passe-compose']))
  })

  it('names the verb of a passive, not "to be" ("ont été retrouvés", "habían sido tirados")', () => {
    const fr = tenses('Les tableaux volés ont été retrouvés. Une personne a été arrêtée.', 'fr')
    expect(fr).toEqual(expect.arrayContaining(['ont été retrouvés|retrouver|passe-compose', 'a été arrêtée|arrêter|passe-compose']))
    expect(fr.some((f) => f.includes('|être|'))).toBe(false)
    expect(tenses('Los vidrios que habían sido tirados descuidadamente.', 'es')).toContain('habían sido tirados|tirar|pluscuamperfecto')
  })

  it('reads a reflexive verb with en / y ("s\'en est allé", "nous nous en sommes aperçus")', () => {
    expect(tenses("Il s'en est allé sans un mot. Elle s'y est rendue.", 'fr')).toEqual(expect.arrayContaining(["s'en est allé|aller|passe-compose", "s'y est rendue|rendre|passe-compose"]))
    expect(tenses('Nous nous en sommes aperçus trop tard. Je m\'en suis voulu.', 'fr')).toEqual(expect.arrayContaining(['nous nous en sommes aperçus|apercevoir|passe-compose', "m'en suis voulu|vouloir|passe-compose"]))
  })

  it('suggests the infinitive when an object pronoun stands before the auxiliary ("je l\'ai vu", "lo he visto")', () => {
    expect(typedCompound('fr', "je l'ai vu")?.lemma).toBe('voir')
    expect(typedCompound('fr', "nous l'avons fait")?.lemma).toBe('faire')
    expect(typedCompound('fr', 'il lui a dit')?.lemma).toBe('dire')
    expect(typedCompound('es', 'lo he visto')?.lemma).toBe('ver')
    expect(typedCompound('es', 'me lo había dicho')?.lemma).toBe('decir')
    // A noun before the auxiliary is still no lead-in.
    expect(typedCompound('fr', 'le chat a mangé')).toBeUndefined()
  })

  it('suggests the infinitive for a typed inverted, passive or en/y compound', () => {
    expect(typedCompound('fr', 'a-t-il compris')?.lemma).toBe('comprendre')
    expect(typedCompound('fr', 'ont été retrouvés')?.lemma).toBe('retrouver')
    expect(typedCompound('fr', "il s'en est allé")?.lemma).toBe('aller')
    expect(typedCompound('es', 'habían sido tirados')?.lemma).toBe('tirar')
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
