import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import { addTenses, tenseVerbs } from '../tenses'
import { labForms, negated, plainOf, reflexiveOf, suggestVerbs, verbLevels, LEVELS } from '../verbLab'

const entry = (language: 'fr' | 'es', lemma: string) => ({ language, lemma, partOfSpeech: 'verb' as const })

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

describe('negation', () => {
  it('Spanish puts no in front', () => {
    expect(negated('es', 'como')).toBe('no como')
    expect(negated('es', 'me lavo')).toBe('no me lavo')
    expect(negated('es', 'he comido')).toBe('no he comido')
  })

  it('French wraps the verb in ne … pas', () => {
    expect(negated('fr', 'mange')).toBe('ne mange pas')
    expect(negated('fr', 'aime')).toBe("n'aime pas")
    expect(negated('fr', 'habite')).toBe("n'habite pas")
    expect(negated('fr', 'ai mangé')).toBe("n'ai pas mangé")
    expect(negated('fr', 'suis allé')).toBe('ne suis pas allé')
    expect(negated('fr', 'me lève')).toBe('ne me lève pas')
    expect(negated('fr', "m'appelle")).toBe("ne m'appelle pas")
    expect(negated('fr', "m'étais levé")).toBe("ne m'étais pas levé")
    expect(negated('fr', 'hais')).toBe('ne hais pas')
  })
})

describe('reflexive and negative forms of a verb', () => {
  it('adds the pronoun for any verb', () => {
    expect(labForms(entry('es', 'lavar'), 'presente', { reflexive: true })?.slice(0, 2)).toEqual(['me lavo', 'te lavas'])
    expect(labForms(entry('fr', 'laver'), 'passe-compose', { reflexive: true })?.[0]).toBe('me suis lavé')
    expect(labForms(entry('fr', 'aimer'), 'present', { reflexive: true })?.[0]).toBe("m'aime")
  })

  it('combines with the negative', () => {
    expect(labForms(entry('es', 'comer'), 'presente', { negative: true })?.[0]).toBe('no como')
    expect(labForms(entry('fr', 'manger'), 'passe-compose', { negative: true })?.[0]).toBe("n'ai pas mangé")
    expect(labForms(entry('fr', 'laver'), 'present', { reflexive: true, negative: true })?.[0]).toBe('ne me lave pas')
  })

  it('a verb that already is reflexive has no further reflexive form', () => {
    expect(reflexiveOf(entry('es', 'lavarse'))).toBeUndefined()
    expect(reflexiveOf(entry('fr', "s'habiller"))).toBeUndefined()
    expect(reflexiveOf(entry('fr', 'habiller'))?.lemma).toBe("s'habiller")
    expect(plainOf(entry('es', 'lavarse')).lemma).toBe('lavar')
    expect(plainOf(entry('fr', 'se lever')).lemma).toBe('lever')
  })
})

describe('levels and suggestions', () => {
  const freq = new Map(['ser', 'estar', 'tener', 'hacer', 'ir'].map((v, i) => [v, i + 1]))

  it('the most frequent verbs come first, every verb has a level', () => {
    const levels = verbLevels('es', freq)
    expect(levels.size).toBe(tenseVerbs('es').length)
    expect(levels.get('ser')).toBe('A1')
    expect(levels.get('tener')).toBe('A1')
    expect([...new Set(levels.values())].every((l) => LEVELS.includes(l))).toBe(true)
  })

  it('a verb the frequency list lacks is C1', () => {
    const levels = verbLevels('es', new Map([['ser', 1]]))
    expect(levels.get('estar')).toBe('C1')
    expect(levels.get('ser')).toBe('A1')
  })

  it('suggests verbs starting with what is typed, the common ones first', () => {
    const s = suggestVerbs('es', 'ten', freq)
    expect(s[0]).toBe('tener')
    expect(s.every((v) => v.includes('ten'))).toBe(true)
    expect(suggestVerbs('es', '', freq)).toEqual([])
  })
})
