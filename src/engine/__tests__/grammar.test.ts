import { describe, expect, it } from 'vitest'
import { checkGrammar, filled, sentenceTokens, mergeGrammarLogs, pickGrammarRound, recordGrammar, topicStats, type GrammarExercise, type GrammarLog } from '../grammar'
import { createRng } from '../rng'

const ex = (id: string, over: Partial<GrammarExercise> = {}): GrammarExercise => ({
  id,
  language: 'fr',
  level: 'B2',
  topic: 'subjonctif',
  type: 'cloze',
  prompt: "Bien qu'il ___ (faire) froid, nous sortons.",
  answer: 'fasse',
  explanation: 'Bien que + subjonctif.',
  source: 'test',
  ...over,
})
const NOW = new Date('2026-10-10T10:00:00Z')

describe('checkGrammar', () => {
  it('takes the word right, ignoring case, spacing and a final dot', () => {
    expect(checkGrammar(ex('a'), 'fasse')).toBe('correct')
    expect(checkGrammar(ex('a'), '  Fasse. ')).toBe('correct')
    expect(checkGrammar(ex('a'), 'fait')).toBe('wrong')
    expect(checkGrammar(ex('a'), '')).toBe('wrong')
  })

  it('knows other right answers, and a careless accent for what it is', () => {
    const e = ex('b', { answer: 'sois', alternatives: ['soyez'] })
    expect(checkGrammar(e, 'soyez')).toBe('correct')
    const accent = ex('c', { answer: 'écrites' })
    expect(checkGrammar(accent, 'ecrites')).toBe('near')
    expect(checkGrammar(accent, 'écrit')).toBe('wrong')
  })

  it('reads curly and straight apostrophes alike', () => {
    expect(checkGrammar(ex('d', { answer: "j'avais" }), 'j’avais')).toBe('correct')
  })
})

describe('filled', () => {
  it('puts the word in the gap; an error sentence stays as it is', () => {
    expect(filled(ex('a'), 'fasse')).toBe("Bien qu'il fasse froid, nous sortons.")
    expect(filled(ex('g', { prompt: 'Hardly had she arrived ___ the phone rang.' }), 'when')).toBe('Hardly had she arrived when the phone rang.')
    expect(filled(ex('e', { type: 'error', prompt: 'Elle est allé.' }), 'x')).toBe('Elle est allé.')
  })
})

describe('sentenceTokens', () => {
  it('cuts a sentence into words and marks the first one that is the wrong word', () => {
    const e = ex('t', { type: 'error', prompt: "Si j'aurais su, je serais resté.", answer: 'aurais', fix: 'avais' })
    const tokens = sentenceTokens(e)
    expect(tokens.map((t) => t.text).join('')).toBe(e.prompt)
    expect(tokens.filter((t) => t.wrong).map((t) => t.text)).toEqual(['aurais'])
    expect(tokens.find((t) => t.text.includes(','))?.word).toBe(false)
  })

  it('marks the first of two equal words only', () => {
    const e = ex('u', { type: 'error', prompt: 'If I would have known, I would have told you.', answer: 'would', fix: 'had', language: 'en' })
    expect(sentenceTokens(e).filter((t) => t.wrong)).toHaveLength(1)
  })
})

describe('the log', () => {
  it('counts rights and wrongs per question, and merges two devices by the larger counts', () => {
    let a: GrammarLog = recordGrammar({}, 'q1', true, NOW)
    a = recordGrammar(a, 'q1', false, NOW)
    let b: GrammarLog = recordGrammar({}, 'q1', true, new Date('2026-10-11T10:00:00Z'))
    b = recordGrammar(b, 'q1', true, new Date('2026-10-11T10:00:00Z'))
    b = recordGrammar(b, 'q2', false, NOW)
    const m = mergeGrammarLogs(a, b)
    expect(m.q1).toMatchObject({ ok: 2, wrong: 1, last: '2026-10-11T10:00:00.000Z' })
    expect(m.q2).toMatchObject({ ok: 0, wrong: 1 })
    expect(mergeGrammarLogs(m, a)).toEqual(m)
  })
})

describe('topicStats', () => {
  it('lists the weakest topic first and the untouched ones last', () => {
    const exercises = [ex('a'), ex('b', { topic: 'participe_passe' }), ex('c', { topic: 'pronoms_relatifs' })]
    let log: GrammarLog = {}
    log = recordGrammar(log, 'a', true, NOW)
    log = recordGrammar(log, 'b', false, NOW)
    expect(topicStats(log, exercises).map((t) => t.topic)).toEqual(['participe_passe', 'subjonctif', 'pronoms_relatifs'])
  })
})

describe('pickGrammarRound', () => {
  const many = Array.from({ length: 30 }, (_, i) => ex(`q${i}`, { topic: i % 2 ? 'subjonctif' : 'participe_passe' }))

  it('picks the size asked, no question twice, and only the topic asked for', () => {
    const round = pickGrammarRound(many, {}, createRng(1), { size: 8 })
    expect(round).toHaveLength(8)
    expect(new Set(round.map((e) => e.id)).size).toBe(8)
    const topical = pickGrammarRound(many, {}, createRng(1), { topic: 'subjonctif', size: 50 })
    expect(topical).toHaveLength(15)
    expect(topical.every((e) => e.topic === 'subjonctif')).toBe(true)
  })

  it('leans towards what was missed and what was never tried, away from what is known', () => {
    let log: GrammarLog = {}
    for (const e of many.slice(0, 20)) for (let i = 0; i < 5; i++) log = recordGrammar(log, e.id, true, NOW)
    for (const e of many.slice(20, 22)) log = recordGrammar(log, e.id, false, NOW)
    let fresh = 0
    let missed = 0
    let known = 0
    for (let seed = 1; seed <= 200; seed++)
      for (const e of pickGrammarRound(many, log, createRng(seed), { size: 4 })) {
        const i = Number(e.id.slice(1))
        if (i >= 22) fresh++
        else if (i >= 20) missed++
        else known++
      }
    // Per question: missed ones are picked most, then the never tried, the well-known least.
    expect(missed / 2).toBeGreaterThan(fresh / 8)
    expect(fresh / 8).toBeGreaterThan(known / 20)
  })

  it('gives what there is when the pool is smaller than the round', () => {
    expect(pickGrammarRound(many.slice(0, 3), {}, createRng(1))).toHaveLength(3)
    expect(pickGrammarRound([], {}, createRng(1))).toEqual([])
  })
})
