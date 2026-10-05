import { describe, expect, it } from 'vitest'
import { acceptedForms, conjugate } from '../conjugation'
import type { TargetLanguage } from '../types'

const verb = (language: TargetLanguage, lemma: string) => conjugate({ language, lemma, partOfSpeech: 'verb' })?.forms

describe('conjugate (présent / presente)', () => {
  it('French irregular verbs come from the table', () => {
    expect(verb('fr', 'être')).toEqual(['suis', 'es', 'est', 'sommes', 'êtes', 'sont'])
    expect(verb('fr', 'prendre')).toEqual(['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'])
    expect(conjugate({ language: 'fr', lemma: 'aller', partOfSpeech: 'verb' })?.source).toBe('table')
  })

  it('French regular patterns, with -ger/-cer spelling in the nous form', () => {
    expect(verb('fr', 'parler')).toEqual(['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent'])
    expect(verb('fr', 'manger')?.[3]).toBe('mangeons')
    expect(verb('fr', 'commencer')?.[3]).toBe('commençons')
    expect(verb('fr', 'attendre')).toEqual(['attends', 'attends', 'attend', 'attendons', 'attendez', 'attendent'])
    expect(verb('fr', 'finir')).toEqual(['finis', 'finis', 'finit', 'finissons', 'finissez', 'finissent'])
    expect(verb('fr', 'créer')).toEqual(['crée', 'crées', 'crée', 'créons', 'créez', 'créent'])
  })

  it('leaves out French verbs whose spelling changes and unknown -ir verbs', () => {
    expect(verb('fr', 'peser')).toBeUndefined()
    expect(verb('fr', 'célébrer')).toBeUndefined()
    expect(verb('fr', 'appuyer')).toBeUndefined()
    expect(verb('fr', 'mentir')).toBeUndefined()
    expect(verb('fr', 'peindre')).toBeUndefined()
  })

  it('French reflexive verbs carry their pronoun, elided before a vowel', () => {
    expect(verb('fr', 'se laver')).toEqual(['me lave', 'te laves', 'se lave', 'nous lavons', 'vous lavez', 'se lavent'])
    expect(verb('fr', "s'habiller")?.[0]).toBe("m'habille")
  })

  it('Spanish regular, stem-changing and irregular verbs', () => {
    expect(verb('es', 'hablar')).toEqual(['hablo', 'hablas', 'habla', 'hablamos', 'habláis', 'hablan'])
    expect(verb('es', 'comer')).toEqual(['como', 'comes', 'come', 'comemos', 'coméis', 'comen'])
    expect(verb('es', 'vivir')).toEqual(['vivo', 'vives', 'vive', 'vivimos', 'vivís', 'viven'])
    expect(verb('es', 'pensar')).toEqual(['pienso', 'piensas', 'piensa', 'pensamos', 'pensáis', 'piensan'])
    expect(verb('es', 'encontrar')?.[0]).toBe('encuentro')
    expect(verb('es', 'pedir')).toEqual(['pido', 'pides', 'pide', 'pedimos', 'pedís', 'piden'])
    expect(verb('es', 'tener')?.[0]).toBe('tengo')
    expect(verb('es', 'levantarse')).toEqual(['me levanto', 'te levantas', 'se levanta', 'nos levantamos', 'os levantáis', 'se levantan'])
  })

  it('leaves out Spanish verbs it cannot conjugate safely', () => {
    expect(verb('es', 'continuar')).toBeUndefined()
    expect(verb('es', 'enviar')).toBeUndefined()
    expect(verb('es', 'reducir')).toBeUndefined()
    expect(conjugate({ language: 'en', lemma: 'decide', partOfSpeech: 'verb' })).toBeUndefined()
    expect(conjugate({ language: 'fr', lemma: 'parler', partOfSpeech: 'noun' })).toBeUndefined()
  })

  it('accepts the form with or without its pronoun', () => {
    expect(acceptedForms('fr', 0, 'aime')).toEqual(['aime', "j'aime"])
    expect(acceptedForms('es', 2, 'habla')).toEqual(['habla', 'él habla', 'ella habla', 'usted habla'])
  })
})

describe('conjugation exercise', () => {
  it('asks a person, accepts the form with or without pronoun, and marks another person’s form as a form error', async () => {
    const { buildExercise, evaluateTyped } = await import('../exercises')
    const { createEntry } = await import('../../data/wordInput')
    const { createRng } = await import('../rng')
    const entry = createEntry({ word: 'parler', meaning: 'konuşmak', partOfSpeech: 'verb' }, 'fr', new Date())
    const ex = buildExercise('conjugation', entry, [entry], createRng(4))
    if (ex.kind !== 'typed') throw new Error('typed expected')
    const form = ex.accepted[0]
    expect(evaluateTyped(ex, form, entry, [entry]).verdict).toBe('correct')
    expect(evaluateTyped(ex, ex.accepted[1], entry, [entry]).verdict).toBe('correct')
    const other = conjugate(entry)!.forms.find((f) => f !== form)!
    expect(evaluateTyped(ex, other, entry, [entry])).toMatchObject({ verdict: 'wrong', errorType: 'form' })
  })
})

describe('dictionary forms (UniMorph)', () => {
  it('leaves out French stem changes the rules would get wrong', async () => {
    const { conjugate } = await import('../conjugation')
    expect(conjugate({ language: 'fr', lemma: 'léguer', partOfSpeech: 'verb' })).toBeUndefined()
    expect(conjugate({ language: 'fr', lemma: 'sevrer', partOfSpeech: 'verb' })).toBeUndefined()
    expect(conjugate({ language: 'fr', lemma: 'entrer', partOfSpeech: 'verb' })?.forms[0]).toBe('entre')
  })

  it('conjugates common verbs beyond the tables, and corrects stem changes', async () => {
    await import('../conjugationData')
    const { conjugate } = await import('../conjugation')
    const of = (language: 'fr' | 'es', lemma: string) => conjugate({ language, lemma, partOfSpeech: 'verb' })
    expect(of('es', 'demostrar')).toMatchObject({ forms: ['demuestro', 'demuestras', 'demuestra', 'demostramos', 'demostráis', 'demuestran'], source: 'dictionary' })
    // Rarer verbs with other tenses in the app: consuelo, not consolo; aliento from Jehle.
    expect(of('es', 'consolar')?.forms[0]).toBe('consuelo')
    expect(of('es', 'alentar')?.forms[0]).toBe('aliento')
    expect(of('fr', 'léguer')?.forms[0]).toBe('lègue')
    expect(of('fr', 'vaincre')?.forms[3]).toBe('vainquons')
    expect(of('fr', 'se résoudre')?.forms[0]).toBe('me résous')
    // Hand tables still win (paie, not the variant paye).
    expect(of('fr', 'payer')).toMatchObject({ forms: ['paie', 'paies', 'paie', 'payons', 'payez', 'paient'], source: 'table' })
  })
})
