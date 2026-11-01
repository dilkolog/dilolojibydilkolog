import { describe, expect, it } from 'vitest'
import { addToMonth, costOf, monthKey } from './usage'

describe('YZ usage', () => {
  it('prices tokens per model', () => {
    expect(costOf('claude-opus-5-5', 1_000_000, 0)).toBe(4)
    expect(costOf('claude-opus-5-5', 1000, 500)).toBeCloseTo(0.014)
    expect(costOf('claude-sonnet-5-5', 1000, 500)).toBeCloseTo(0.007)
    expect(costOf('claude-haiku-4-5', 0, 1_000_000)).toBe(5)
  })

  it('adds requests into a monthly total with a per-feature breakdown', () => {
    const at = new Date('2026-10-02T10:00:00')
    const r = (feature: 'story' | 'sentence', cost: number) => ({ feature, model: 'claude-opus-5-5' as const, inputTokens: 100, outputTokens: 50, cost, at })
    const m = addToMonth(addToMonth(addToMonth(undefined, r('story', 0.05)), r('sentence', 0.02)), r('story', 0.04))
    expect(m.requests).toBe(3)
    expect(m.cost).toBeCloseTo(0.11)
    expect(m.features.story).toEqual({ requests: 2, cost: expect.closeTo(0.09) })
    expect(monthKey(at)).toBe('2026-10')
  })
})

describe('which features run on the cheap model', () => {
  it('keeps feedback, stories and Monki on the site model and only mechanical jobs on the cheapest', async () => {
    const { CHEAP_FEATURES } = await import('./usage')
    for (const f of ['monki', 'chat', 'sentence', 'translation', 'story', 'journal', 'comprehension', 'photo_words', 'podcast'] as const) expect(CHEAP_FEATURES.has(f)).toBe(false)
    for (const f of ['word_fill', 'mnemonic', 'word_suggest'] as const) expect(CHEAP_FEATURES.has(f)).toBe(true)
  })
})
