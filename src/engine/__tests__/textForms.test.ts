import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import { analyzeText } from '../reading'
import { addTenses } from '../tenses'
import { groupByTense, textForms } from '../textForms'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

const analyze = (text: string, lang: 'fr' | 'es') => analyzeText(text, lang, [], [], new Set())

describe('verb forms in a text', () => {
  it('finds the forms in reading order, with their verb and tense', () => {
    const found = textForms('fr', analyze('Je parle. Nous parlions hier.', 'fr'))
    expect(found).toContainEqual({ form: 'parle', lemma: 'parler', tense: 'present' })
    expect(found).toContainEqual({ form: 'parlions', lemma: 'parler', tense: 'imparfait' })
    expect(found.findIndex((f) => f.form === 'parle')).toBeLessThan(found.findIndex((f) => f.form === 'parlions'))
  })

  it('reads a leading imperative before an exclamation mark as an imperative', () => {
    const found = textForms('fr', analyze('Viens ici !', 'fr'))
    expect(found.some((f) => f.lemma === 'venir' && f.form === 'viens')).toBe(true)
  })

  it('works in Spanish and finds nothing in a text without verbs', () => {
    expect(textForms('es', analyze('Ella habla mucho.', 'es'))).toContainEqual({ form: 'habla', lemma: 'hablar', tense: 'presente' })
    expect(textForms('fr', analyze('Le chat noir.', 'fr'))).toEqual([])
  })
})

describe('compound tenses in a text', () => {
  const tenses = (text: string, lang: 'fr' | 'es') => textForms(lang, analyze(text, lang)).map((f) => `${f.form}|${f.lemma}|${f.tense}`)

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
  it('puts the busiest tense first and counts a repeated form once with its count', () => {
    const groups = groupByTense([
      { form: 'parle', lemma: 'parler', tense: 'present' },
      { form: 'parlait', lemma: 'parler', tense: 'imparfait' },
      { form: 'parlait', lemma: 'parler', tense: 'imparfait' },
      { form: 'allait', lemma: 'aller', tense: 'imparfait' },
      { form: 'allait', lemma: 'aller', tense: 'imparfait' },
      { form: 'allait', lemma: 'aller', tense: 'imparfait' },
    ])
    expect(groups.map((g) => [g.tense, g.total])).toEqual([['imparfait', 5], ['present', 1]])
    expect(groups[0].forms).toEqual([
      { form: 'allait', lemma: 'aller', count: 3 },
      { form: 'parlait', lemma: 'parler', count: 2 },
    ])
  })

  it('is empty for no forms', () => {
    expect(groupByTense([])).toEqual([])
  })
})
