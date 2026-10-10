import { describe, expect, it } from 'vitest'
import { listeningRate, MINIMAL_PAIRS, pairKey, pairRound } from '../listening'
import { recordGrammar } from '../grammar'
import { createRng } from '../rng'

describe('listeningRate', () => {
  it('speeds up as the word gets stronger, within bounds', () => {
    expect(listeningRate(1)).toBe(0.9)
    expect(listeningRate(1, 5)).toBe(1)
    expect(listeningRate(1, 20)).toBe(1.1)
    expect(listeningRate(1, 100)).toBe(1.2)
    expect(listeningRate(1.3, 100)).toBe(1.4)
  })
})

describe('minimal pairs', () => {
  it('every pair differs and a round covers varied pairs with both answers', () => {
    for (const pairs of Object.values(MINIMAL_PAIRS)) for (const p of pairs) expect(p.a.word).not.toBe(p.b.word)
    const round = pairRound('fr', 12, createRng(3))
    expect(round).toHaveLength(12)
    expect(new Set(round.map((q) => q.pair.a.word)).size).toBeGreaterThan(6)
    expect(new Set(round.map((q) => q.answer))).toEqual(new Set(['a', 'b']))
  })

  it('puts the pairs missed before first, and keys them by language and words', () => {
    const missed = MINIMAL_PAIRS.fr[3]
    let log = recordGrammar({}, pairKey('fr', missed), false, new Date())
    for (const q of MINIMAL_PAIRS.fr) if (q !== missed) log = recordGrammar(log, pairKey('fr', q), true, new Date())
    const leads = new Set<string>()
    for (let seed = 1; seed <= 20; seed++) leads.add(pairRound('fr', 5, createRng(seed), log)[0].pair.a.word)
    expect(leads.has(missed.a.word)).toBe(true)
    expect(pairKey('fr', missed)).toBe(`fr:${missed.a.word}|${missed.b.word}`)
  })

  it('has no pair twice in a language', () => {
    for (const pairs of Object.values(MINIMAL_PAIRS)) expect(new Set(pairs.map((x) => `${x.a.word}|${x.b.word}`)).size).toBe(pairs.length)
  })
})
