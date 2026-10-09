import { describe, expect, it } from 'vitest'
import { cefrOf, levelCoverage, parseCefrList, wordsAt } from '../cefrLevels'
import type { VocabularyEntry } from '../types'

const list = parseCefrList('le\tA1\nchat\tA1\nmaison\tA1\nlever\tA1\nà pied\tA1\ngouvernement\tA2\névêque\tB1\nlevantar\tA2\nreír\tA2\n')
const entry = (lemma: string, language: 'fr' | 'es' = 'fr') => ({ id: lemma, lemma, language }) as VocabularyEntry

describe('CEFR levels', () => {
  it('finds a word as written, without its reflexive pronoun, or a Spanish verb without -se', () => {
    expect(cefrOf(entry('Gouvernement'), list)).toBe('A2')
    expect(cefrOf(entry('se lever'), list)).toBe('A1')
    expect(cefrOf(entry('levantarse', 'es'), list)).toBe('A2')
    expect(cefrOf(entry('reírse', 'es'), list)).toBe('A2')
    expect(cefrOf(entry('chien'), list)).toBeUndefined()
  })
  it('lists a level’s single words in order and counts what the learner has, level by level', () => {
    expect(wordsAt(list, 'A1')).toEqual(['le', 'chat', 'maison', 'lever'])
    const cov = levelCoverage(list, 'fr', [entry('maison')], [], new Set(['chat']))
    // le: a function word; chat: marked known; maison: in the list, being learned; lever: not yet.
    expect(cov.find((c) => c.level === 'A1')).toEqual({ level: 'A1', total: 4, known: 2, learning: 1 })
    expect(cov.find((c) => c.level === 'A2')).toEqual({ level: 'A2', total: 3, known: 0, learning: 0 })
  })
})
