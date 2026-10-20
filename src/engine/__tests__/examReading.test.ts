import { describe, expect, it } from 'vitest'
import { examPassages } from '../../data/examReading'
import { examQuestionId, passageOrder, passageShare, shuffledQuestion, wordCount } from '../examReading'
import { createRng } from '../rng'

describe('exam-style reading and listening passages', () => {
  it('each language has two passages at A2, B1 and B2, with unique ids and sound questions', () => {
    expect(new Set(examPassages.map((p) => p.id)).size).toBe(examPassages.length)
    for (const language of ['fr', 'es', 'en'] as const) {
      const own = examPassages.filter((p) => p.language === language)
      for (const level of ['A2', 'B1', 'B2']) expect(own.filter((p) => p.level === level).length, `${language} ${level}`).toBe(2)
      for (const p of own) {
        expect(p.id.startsWith(`${language}-`), p.id).toBe(true)
        for (const k of ['exam', 'title', 'text', 'tr'] as const) expect(p[k].trim(), `${p.id}.${k}`).not.toBe('')
        expect(p.questions.length, p.id).toBe(3)
        const prompts = new Set<string>()
        for (const q of p.questions) {
          expect(q.options.length, `${p.id}: ${q.prompt}`).toBeGreaterThanOrEqual(3)
          expect(q.options.length, `${p.id}: ${q.prompt}`).toBeLessThanOrEqual(4)
          expect(new Set(q.options.map((o) => o.trim().toLowerCase())).size, `${p.id}: ${q.prompt}`).toBe(q.options.length)
          expect(q.answer >= 0 && q.answer < q.options.length, `${p.id}: ${q.prompt}`).toBe(true)
          expect(q.why.trim(), `${p.id}: ${q.prompt}`).not.toBe('')
          expect(prompts.has(q.prompt), `${p.id}: asked twice`).toBe(false)
          prompts.add(q.prompt)
        }
      }
    }
  })

  it('a text is about as long as its level asks', () => {
    const range = { A2: [40, 95], B1: [70, 150], B2: [95, 200] } as const
    for (const p of examPassages) {
      const n = wordCount(p.text)
      expect(n, `${p.id} (${n} words)`).toBeGreaterThanOrEqual(range[p.level][0])
      expect(n, `${p.id} (${n} words)`).toBeLessThanOrEqual(range[p.level][1])
    }
  })
})

describe('exam passages: order, result and shuffling', () => {
  const [a, b, c] = examPassages.filter((p) => p.language === 'fr')

  it('puts passages answered wrong before the untried and the right ones last', () => {
    const log = {
      [examQuestionId(a, 0)]: { ok: 4, wrong: 0, last: 'x' },
      [examQuestionId(a, 1)]: { ok: 4, wrong: 0, last: 'x' },
      [examQuestionId(b, 0)]: { ok: 0, wrong: 3, last: 'x' },
    }
    let bBeforeA = 0
    for (let s = 1; s <= 60; s++) {
      const order = passageOrder(examPassages, log, 'fr', createRng(s)).map((p) => p.id)
      if (order.indexOf(b.id) < order.indexOf(a.id)) bBeforeA++
    }
    expect(bBeforeA).toBeGreaterThan(45)
    expect(passageOrder(examPassages, log, 'fr', createRng(1)).every((p) => p.language === 'fr')).toBe(true)
    expect(passageOrder(examPassages, {}, 'fr', createRng(1), 'B1').every((p) => p.level === 'B1')).toBe(true)
    expect(c).toBeTruthy()
  })

  it('shares the last result out of all questions, and nothing for a passage never tried', () => {
    expect(passageShare(a, {})).toBeUndefined()
    const log = { [examQuestionId(a, 0)]: { ok: 1, wrong: 0, last: 'x', streak: 1 }, [examQuestionId(a, 1)]: { ok: 0, wrong: 1, last: 'x', streak: 0 } }
    expect(passageShare(a, log)).toBeCloseTo(1 / 3)
  })

  it('shuffles the options and keeps track of the right one', () => {
    const q = a.questions[0]
    for (let s = 1; s <= 30; s++) {
      const r = shuffledQuestion(q, createRng(s))
      expect([...r.options].sort()).toEqual([...q.options].sort())
      expect(r.options[r.answer]).toBe(q.options[q.answer])
    }
  })
})
