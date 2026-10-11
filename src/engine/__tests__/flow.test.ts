import { describe, expect, it } from 'vitest'
import { flowGapId, flowParts, flowRound, shuffledOptions, type FlowItem } from '../flow'
import { createRng } from '../rng'

const item = (id: string): FlowItem => ({
  id,
  language: 'en',
  text: 'It rained. {1}, we went out. {2} we got wet, it was fun.',
  tr: 'Yağmur yağdı.',
  gaps: [
    { answer: 'Nevertheless', options: ['Nevertheless', 'Therefore', 'Because'], kind: 'Zıtlık', why: 'x' },
    { answer: 'Although', options: ['Although', 'So that', 'Unless'], kind: 'Taviz', why: 'y' },
  ],
  source: 'test',
})

describe('flow', () => {
  it('cuts the paragraph at its gaps, in order', () => {
    expect(flowParts(item('en-a'))).toEqual([{ text: 'It rained. ' }, { gap: 0 }, { text: ', we went out. ' }, { gap: 1 }, { text: ' we got wet, it was fun.' }])
  })

  it('shuffles the options without losing any', () => {
    const gap = item('en-a').gaps[0]
    expect([...shuffledOptions(gap, createRng(3))].sort()).toEqual([...gap.options].sort())
  })

  it('puts the paragraphs whose gaps went wrong first, and keeps to the language', () => {
    const items = [item('en-a'), item('en-b'), item('en-c'), { ...item('fr-d'), language: 'fr' as const }]
    const log = {
      [flowGapId(items[0], 0)]: { ok: 5, wrong: 0, last: '2026-01-01' },
      [flowGapId(items[0], 1)]: { ok: 5, wrong: 0, last: '2026-01-01' },
      [flowGapId(items[1], 0)]: { ok: 0, wrong: 4, last: '2026-01-01' },
    }
    let first = 0
    for (let s = 1; s <= 40; s++) {
      const round = flowRound(items, log, 'en', createRng(s), 1)
      expect(round).toHaveLength(1)
      if (round[0].id === 'en-b') first++
    }
    expect(first).toBeGreaterThan(20)
    expect(flowRound(items, {}, 'en', createRng(1), 10).map((i) => i.id).sort()).toEqual(['en-a', 'en-b', 'en-c'])
  })
})
