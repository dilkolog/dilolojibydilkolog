import { describe, expect, it } from 'vitest'
import { buildWordGraph } from '../graph'
import { affect, decide, decision, effect, improve } from './fixtures'

describe('buildWordGraph', () => {
  it('links relations, families, shared roots and tags without duplicates', () => {
    const tagged = [{ ...improve, tags: ['iş'] }, { ...decide, tags: ['iş'] }]
    const links = buildWordGraph([affect, effect, decision, ...tagged])
    const has = (a: string, b: string, kind: string) => links.some((l) => [l.source, l.target].sort().join() === [a, b].sort().join() && l.kind === kind)
    expect(has('en:affect', 'en:effect', 'confusable')).toBe(true)
    expect(has('en:decision', 'en:decide', 'family')).toBe(true)
    expect(has('en:improve', 'en:decide', 'tag')).toBe(true)
    // affect→effect and effect→affect are one link.
    expect(links.filter((l) => l.kind === 'confusable')).toHaveLength(1)
  })
  it('ignores links to words outside the graph', () => {
    expect(buildWordGraph([affect])).toEqual([])
  })
})
