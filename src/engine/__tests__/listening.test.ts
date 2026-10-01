import { describe, expect, it } from 'vitest'
import { listeningRate, MINIMAL_PAIRS, pairRound } from '../listening'
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
})
