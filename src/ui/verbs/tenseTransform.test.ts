import { beforeAll, describe, expect, it } from 'vitest'
import '../../engine/conjugationData'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import frSentences from '../../data/tenses/fr-sentences.json'
import esSentences from '../../data/tenses/es-sentences.json'
import { addTenses, addTenseSentences, tenseVerbs } from '../../engine/tenses'
import { fitsTime, narrowBySubject, personsOfForm, TRANSFORM_PAIRS, transformFor, transformRound } from './tenseTransform'
import { judge } from './labShared'
import { conjugateTense } from '../../engine/tenses'
import { verbEntry } from './labShared'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
  addTenseSentences('fr', frSentences as Record<string, Record<string, string>>)
  addTenseSentences('es', esSentences as Record<string, Record<string, string>>)
})

describe('time words', () => {
  it('a sentence tied to yesterday is not moved into the future', () => {
    expect(fitsTime('es', 'Ayer ___ una reunión.', 'futuro')).toBe(false)
    expect(fitsTime('es', 'Ayer ___ una reunión.', 'imperfecto')).toBe(true)
    expect(fitsTime('fr', 'Demain, nous ___ à la mer.', 'passe-compose')).toBe(false)
    expect(fitsTime('fr', 'Demain, nous ___ à la mer.', 'present')).toBe(true)
  })

  it('accented words are found, and "il y a" is "ago" only before a length of time', () => {
    expect(fitsTime('fr', "À l'époque, il ___ ici.", 'futur')).toBe(false)
    expect(fitsTime('fr', 'Ce jour-là, il ___ très tôt.', 'futur')).toBe(false)
    expect(fitsTime('fr', "À l’avenir, nous ___ mieux.", 'passe-compose')).toBe(false)
    expect(fitsTime('fr', 'Il y a deux ans, je ___ à Lyon.', 'futur')).toBe(false)
    expect(fitsTime('fr', 'Il y a un chat qui ___ dans le jardin.', 'present')).toBe(true)
  })

  it('the morning is not tomorrow', () => {
    expect(fitsTime('es', 'Esta mañana ___ café.', 'preterito')).toBe(true)
    expect(fitsTime('es', 'Mañana ___ café.', 'preterito')).toBe(false)
  })
})

describe('the move', () => {
  it('finds the person of the form, every one when they look alike', () => {
    expect(personsOfForm('es', 'tener', 'preterito', 'tuve')).toEqual([0])
    expect(personsOfForm('fr', 'parler', 'imparfait', 'parlais')).toEqual([0, 1])
  })

  it('a French subject pronoun settles the person', () => {
    expect(narrowBySubject('fr', "J'___ les enfants à l'école.", [0, 1])).toEqual([0])
    expect(narrowBySubject('fr', 'Tu ___ trop vite.', [0, 1])).toEqual([1])
    expect(narrowBySubject('fr', 'Mon frère ___ souvent.', [0, 1])).toEqual([0, 1])
    // "jeune" is not "je".
    expect(narrowBySubject('fr', 'Le jeune homme ___ vite.', [0, 1])).toEqual([0, 1])
  })

  it('a question keeps the person and asks the other tense', () => {
    const q = transformFor('es', 'tener', 'presente', 'preterito')
    expect(q).toBeDefined()
    expect(q!.form).toBe('Tengo')
    expect(q!.persons).toEqual([0])
    expect(judge('es', 'tener', 'preterito', 0, 'tuve')).toBe(true)
  })

  it('every pair gives questions, and every question has an answer in its target tense', () => {
    for (const language of ['es', 'fr'] as const) {
      const verbs = tenseVerbs(language)
      for (const [from, to] of TRANSFORM_PAIRS[language]) {
        const found = verbs.map((v) => transformFor(language, v, from, to)).filter(Boolean)
        expect(found.length, `${language} ${from} → ${to}`).toBeGreaterThan(30)
        for (const q of found.slice(0, 40)) {
          const target = conjugateTense(verbEntry(language, q!.verb), to)!
          expect(q!.persons.some((p) => judge(language, q!.verb, to, p, target[p])), `${q!.verb} ${to}`).toBe(true)
        }
      }
    }
  })

  it('a round starts with the chosen verb and asks each verb once', () => {
    const round = transformRound('es', ['tener', ...tenseVerbs('es').slice(0, 100)], 1)
    expect(round.length).toBe(8)
    expect(round[0].verb).toBe('tener')
    expect(new Set(round.map((q) => q.verb)).size).toBe(round.length)
  })
})
