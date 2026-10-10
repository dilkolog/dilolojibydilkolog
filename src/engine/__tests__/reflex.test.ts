import { describe, expect, it } from 'vitest'
import { createRng } from '../rng'
import { recordGrammar } from '../grammar'
import { reflexQuestion, reflexRound, REFLEX_OPTIONS, type ReflexPhrase } from '../reflex'

const phrase = (id: string, group: string, fr: string): ReflexPhrase => ({ id, group, tr: `tr-${id}`, fr, es: `es-${id}`, en: `en-${id}` })
const ALL = [
  phrase('a', 'plan', 'Je suis en route'),
  phrase('b', 'plan', 'Je vais être en retard'),
  phrase('c', 'plan', 'On se retrouve quand ?'),
  phrase('d', 'plan', "Je t'appelle plus tard"),
  phrase('e', 'tepki', 'Quel dommage !'),
  phrase('f', 'tepki', 'Génial !'),
]

describe('reflexQuestion', () => {
  it('offers the answer among four different phrases of the language, the same group first', () => {
    const q = reflexQuestion(ALL[0], ALL, 'fr', createRng(1))
    expect(q.options).toHaveLength(REFLEX_OPTIONS)
    expect(new Set(q.options).size).toBe(REFLEX_OPTIONS)
    expect(q.options).toContain('Je suis en route')
    expect(q.answer).toBe('Je suis en route')
    expect(q.turkish).toBe('tr-a')
    // Three others of the same group exist: no phrase of another group is needed.
    expect(q.options.filter((o) => !['Je suis en route', 'Je vais être en retard', 'On se retrouve quand ?', "Je t'appelle plus tard"].includes(o))).toEqual([])
  })

  it('falls back on other groups and never repeats a text', () => {
    const q = reflexQuestion(ALL[4], ALL, 'fr', createRng(2))
    expect(q.options).toHaveLength(REFLEX_OPTIONS)
    expect(new Set(q.options).size).toBe(REFLEX_OPTIONS)
  })

  it('gives fewer choices only when there are not enough phrases', () => {
    expect(reflexQuestion(ALL[0], ALL.slice(0, 2), 'fr', createRng(3)).options).toHaveLength(2)
  })
})

describe('reflexRound', () => {
  it('asks each phrase once and puts the missed ones first', () => {
    let log = recordGrammar({}, 'c', false, new Date())
    for (const id of ['a', 'b', 'd', 'e', 'f']) log = recordGrammar(log, id, true, new Date())
    const firsts = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) {
      const round = reflexRound(ALL, log, 'fr', createRng(seed), 6)
      expect(new Set(round.map((q) => q.id)).size).toBe(6)
      firsts.add(round[0].id)
    }
    // The missed phrase leads more often than any other.
    expect(firsts.has('c')).toBe(true)
  })
})
