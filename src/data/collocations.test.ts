import { describe, expect, it } from 'vitest'
import { collocationsOf } from '../engine/collocations'
import { collocations } from './collocations'

describe('the collocation lists', () => {
  it('are in each language, with unique ids, a pattern, an example with its Turkish and a source', () => {
    for (const l of ['fr', 'es', 'en'] as const) expect(collocations.filter((c) => c.language === l).length, l).toBeGreaterThanOrEqual(20)
    expect(new Set(collocations.map((c) => c.id)).size).toBe(collocations.length)
    for (const c of collocations) {
      expect(c.id.startsWith(`${c.language}-`), c.id).toBe(true)
      expect(c.lemmas.length, c.id).toBeGreaterThan(0)
      for (const k of ['pattern', 'example', 'tr', 'source'] as const) expect(c[k].trim(), `${c.id}.${k}`).not.toBe('')
    }
  })
})

describe('collocationsOf', () => {
  it('finds what a word goes with, from either word, and nothing for another language or word', () => {
    expect(collocationsOf(collocations, 'fr', 'décider').map((c) => c.pattern)).toEqual(['décider de + infinitif'])
    expect(collocationsOf(collocations, 'fr', 'Question').map((c) => c.pattern)).toEqual(['poser une question'])
    expect(collocationsOf(collocations, 'en', 'décider')).toEqual([])
    expect(collocationsOf(collocations, 'fr', 'chat')).toEqual([])
  })

  it('shows at most two', () => {
    const many = ['a', 'b', 'c'].map((x) => ({ id: `fr-${x}`, language: 'fr' as const, lemmas: ['mot'], pattern: x, example: x, tr: x, source: x }))
    expect(collocationsOf(many, 'fr', 'mot')).toHaveLength(2)
  })
})
