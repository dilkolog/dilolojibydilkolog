import { describe, expect, it } from 'vitest'
import { createRng, pick, shuffle } from '../rng'

describe('createRng (mulberry32)', () => {
  it('produces deterministic pseudorandom numbers in [0, 1)', () => {
    const rng1 = createRng(42)
    const rng2 = createRng(42)

    const seq1 = [rng1(), rng1(), rng1(), rng1()]
    const seq2 = [rng2(), rng2(), rng2(), rng2()]

    expect(seq1).toEqual(seq2)
    for (const n of seq1) {
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
    }
  })

  it('produces different sequences for different seeds', () => {
    const rngA = createRng(100)
    const rngB = createRng(200)

    const valA = rngA()
    const valB = rngB()
    expect(valA).not.toBe(valB)
  })
})

describe('shuffle', () => {
  it('returns a shuffled copy without mutating the original array', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8]
    const rng = createRng(12345)
    const shuffled = shuffle(original, rng)

    expect(shuffled).not.toBe(original)
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(shuffled).toHaveLength(original.length)
    expect([...shuffled].sort()).toEqual([...original].sort())
    // With 8 items, a deterministic shuffle should differ in order from original
    expect(shuffled).not.toEqual(original)
  })

  it('handles empty and single-element arrays', () => {
    const rng = createRng(1)
    expect(shuffle([], rng)).toEqual([])
    expect(shuffle([42], rng)).toEqual([42])
  })
})

describe('pick', () => {
  it('picks an item from the given items according to the rng', () => {
    const items = ['apple', 'banana', 'cherry']
    const rng = createRng(99)
    const chosen = pick(items, rng)
    expect(items).toContain(chosen)
  })
})
