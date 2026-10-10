import { describe, expect, it } from 'vitest'
import { recordGrammar } from '../grammar'
import { createRng } from '../rng'
import { registerQuestion, registerRound, REGISTERS, SITUATION, type RegisterItem } from '../register'

const item = (id: string, language: RegisterItem['language'] = 'fr'): RegisterItem => ({ id, language, tr: id, informal: `${id}-i`, standard: `${id}-s`, formal: `${id}-f`, source: 't' })
const ITEMS = [item('a'), item('b'), item('c'), item('d'), item('x', 'es')]

describe('registerQuestion', () => {
  it('asks for the word that suits the situation among the three, shuffled', () => {
    for (const register of REGISTERS) {
      const q = registerQuestion(ITEMS[0], register, createRng(3))
      expect(q.answer).toBe(ITEMS[0][register])
      expect([...q.options].sort()).toEqual(['a-f', 'a-i', 'a-s'])
      expect(q.situation).toBe(SITUATION[register])
      expect(q.id).toBe(`a|${register}`)
    }
  })
})

describe('registerRound', () => {
  it('has each thought once, only in the language asked, in any of its situations', () => {
    const seenRegisters = new Set<string>()
    for (let seed = 1; seed <= 20; seed++) {
      const round = registerRound(ITEMS, {}, 'fr', createRng(seed), 4)
      expect(round.map((q) => q.item.id).sort()).toEqual(['a', 'b', 'c', 'd'])
      round.forEach((q) => seenRegisters.add(q.register))
    }
    expect(seenRegisters.size).toBe(3)
  })

  it('brings the situations missed before first', () => {
    let log = recordGrammar({}, 'c|formal', false, new Date())
    for (const q of ['a', 'b', 'd']) for (const r of REGISTERS) log = recordGrammar(log, `${q}|${r}`, true, new Date())
    const leads = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) leads.add(registerRound(ITEMS, log, 'fr', createRng(seed), 4)[0].id)
    expect(leads.has('c|formal')).toBe(true)
  })
})
