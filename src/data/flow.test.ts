import { describe, expect, it } from 'vitest'
import { flowItems } from './flow'

describe('the text-flow paragraphs', () => {
  it('are in each language, with unique ids, a gap marker for every gap and one right answer among three options', () => {
    for (const l of ['fr', 'es', 'en']) expect(flowItems.filter((i) => i.language === l).length, l).toBeGreaterThanOrEqual(5)
    expect(new Set(flowItems.map((i) => i.id)).size).toBe(flowItems.length)
    for (const i of flowItems) {
      expect(i.id.startsWith(`${i.language}-`), i.id).toBe(true)
      for (const k of ['text', 'tr', 'source'] as const) expect(i[k].trim(), `${i.id}.${k}`).not.toBe('')
      const marks = [...i.text.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]))
      expect(marks, i.id).toEqual(i.gaps.map((_, n) => n + 1))
      for (const g of i.gaps) {
        expect(g.options, i.id).toContain(g.answer)
        expect(new Set(g.options).size, `${i.id} ${g.answer}`).toBe(g.options.length)
        expect(g.options.length, i.id).toBeGreaterThanOrEqual(3)
        expect(g.kind.trim(), i.id).not.toBe('')
        expect(g.why.trim(), i.id).not.toBe('')
        // All options in the same case: the first letter would otherwise give the answer away.
        const upper = (s: string) => s[0] === s[0].toUpperCase()
        expect(new Set(g.options.map(upper)).size, `${i.id} ${g.answer}`).toBe(1)
      }
    }
  })
})
