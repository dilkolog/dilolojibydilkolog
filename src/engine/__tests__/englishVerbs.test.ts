import { describe, expect, it } from 'vitest'
import { irregularVerbs, phrasalVerbs } from '../../data/englishVerbs'
import { formRight, formsText, irregularRound, phrasalQuestion, phrasalRound, VERB_ROUND } from '../englishVerbs'
import { createRng } from '../rng'

describe('English verbs: the data', () => {
  it('irregular verbs have unique ids and every form filled in', () => {
    expect(irregularVerbs.length).toBeGreaterThanOrEqual(160)
    expect(new Set(irregularVerbs.map((v) => v.id)).size).toBe(irregularVerbs.length)
    for (const v of irregularVerbs) {
      expect(v.id, v.base).toBe(`irr|${v.base}`)
      expect(v.past.length && v.pp.length, v.base).toBeTruthy()
      for (const f of [...v.past, ...v.pp, v.tr, v.text, v.textTr]) expect(f.trim(), v.base).not.toBe('')
      // The example sentence uses one of the past simple forms as a word of its own.
      expect(v.past.some((f) => new RegExp(`(?<![A-Za-z])${f}(?![A-Za-z])`, 'i').test(v.text)), `${v.base}: ${v.text}`).toBe(true)
    }
  })

  it('phrasal verbs have unique ids and a sentence that contains the verb', () => {
    expect(phrasalVerbs.length).toBeGreaterThanOrEqual(170)
    expect(new Set(phrasalVerbs.map((v) => v.id)).size).toBe(phrasalVerbs.length)
    for (const v of phrasalVerbs) {
      expect(v.id).toBe(`phr|${v.phrasal}`)
      for (const f of [v.tr, v.text, v.textTr]) expect(f.trim(), v.phrasal).not.toBe('')
    }
  })
})

describe('English verbs: rounds', () => {
  it('accepts every listed form, whatever the case and spacing', () => {
    const be = irregularVerbs.find((v) => v.base === 'be')!
    expect(formRight(' Were ', be.past)).toBe(true)
    expect(formRight('was', be.past)).toBe(true)
    expect(formRight('is', be.past)).toBe(false)
    const learn = irregularVerbs.find((v) => v.base === 'learn')!
    expect(formsText(learn.pp)).toBe('learnt / learned')
  })

  it('a round has the size asked and no verb twice', () => {
    const round = irregularRound(irregularVerbs, {}, createRng(3))
    expect(round).toHaveLength(VERB_ROUND)
    expect(new Set(round.map((v) => v.id)).size).toBe(VERB_ROUND)
  })

  it('a question has four different options with the answer among them; a wrong particle never makes another listed phrasal verb', () => {
    const ids = new Set(phrasalVerbs.map((v) => v.phrasal))
    let particles = 0
    for (let seed = 1; seed <= 60; seed++) {
      for (const q of phrasalRound(phrasalVerbs, {}, createRng(seed), 5)) {
        expect(q.options).toHaveLength(4)
        expect(new Set(q.options).size).toBe(4)
        expect(q.options).toContain(q.answer)
        if (q.kind === 'particle') {
          particles++
          const [head] = q.verb.phrasal.split(' ')
          for (const o of q.options) if (o !== q.answer) expect(ids.has(`${head} ${o}`), `${head} ${o}`).toBe(false)
        }
      }
    }
    expect(particles).toBeGreaterThan(20)
  })

  it('a three-word phrasal verb is only asked for its meaning', () => {
    const v = phrasalVerbs.find((p) => p.phrasal === 'put up with')!
    for (let seed = 1; seed <= 20; seed++) expect(phrasalQuestion(v, phrasalVerbs, createRng(seed)).kind).toBe('meaning')
  })
})
