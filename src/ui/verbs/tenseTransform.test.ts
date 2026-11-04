import { beforeAll, describe, expect, it } from 'vitest'
import '../../engine/conjugationData'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import frSentences from '../../data/tenses/fr-sentences.json'
import esSentences from '../../data/tenses/es-sentences.json'
import { addTenses, addTenseSentences, tenseVerbs } from '../../engine/tenses'
import { choiceRound, fitsTime, narrowBySubject, pairQuestion, personsOfForm, TRANSFORM_PAIRS, transformFor, transformRound } from './tenseTransform'
import type { TransformPair } from '../../engine/transformPairs'
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

describe('rounds with written pairs', () => {
  const pair = (verb: string, kind: TransformPair['kind'], n: number): TransformPair => ({
    id: `fr|${verb}|${kind}|${n}`,
    verb,
    kind,
    from: 'present',
    to: 'imparfait',
    source: `Il dit qu’il [${verb === 'être' ? 'est' : 'a'}] là ${n}.`,
    target: `Il a dit qu’il [${verb === 'être' ? 'était' : 'avait'}] là ${n}.`,
    tr: 'Orada olduğunu söyledi.',
    persons: [2],
  })
  const pairs = [pair('être', 'aktarim', 1), pair('avoir', 'aktarim', 2), pair('avoir', 'aktarim', 3), pair('être', 'temel', 4)]

  it('a pair becomes a question with a gap in the target', () => {
    const q = pairQuestion(pairs[0])!
    expect(q.text).toBe('Il dit qu’il ___ là 1.')
    expect(q.form).toBe('est')
    expect(q.target).toBe('Il a dit qu’il ___ là 1.')
    expect(q.kind).toBe('aktarim')
  })

  it('one kind: only its pairs, the chosen verb first, each verb once', () => {
    for (let seed = 1; seed < 20; seed++) {
      const r = choiceRound('fr', ['avoir', 'être'], pairs, 'aktarim', seed)
      expect(r.map((q) => q.kind)).toEqual(['aktarim', 'aktarim'])
      expect(r[0].verb).toBe('avoir')
      expect(new Set(r.map((q) => q.verb)).size).toBe(r.length)
    }
  })

  it('mixed: written pairs and plain sentences both come', () => {
    const verbs = tenseVerbs('fr').slice(0, 200)
    const r = choiceRound('fr', verbs, pairs, 'mixed', 3)
    expect(r.some((q) => q.target)).toBe(true)
    expect(r.some((q) => !q.target)).toBe(true)
    expect(new Set(r.map((q) => q.verb)).size).toBe(r.length)
  })
})

it('a written pair keeps only the person its subject names', () => {
  const p: TransformPair = { id: 'x', verb: 'parler', kind: 'kosul', from: 'conditionnel', to: 'conditionnel-passe', source: 'Si je pouvais, je lui [parlerais].', target: 'Si j’avais pu, je lui [aurais parlé].', tr: 'x', persons: [0, 1] }
  expect(choiceRound('fr', ['parler'], [p], 'kosul', 1)[0].persons).toEqual([0])
})
