import { describe, expect, it } from 'vitest'
import { trapWords } from './traps'

describe('the false friends', () => {
  it('are in each language, with unique ids and everything filled in', () => {
    for (const l of ['fr', 'es', 'en']) expect(trapWords.filter((t) => t.language === l).length, l).toBeGreaterThanOrEqual(9)
    expect(new Set(trapWords.map((t) => t.id)).size).toBe(trapWords.length)
    for (const t of trapWords) {
      expect(t.id, t.id).toBe(`${t.language}-${t.lemma}`)
      for (const k of ['lemma', 'looks', 'trap', 'meaning', 'text', 'tr', 'source'] as const) expect(t[k].trim(), `${t.id}.${k}`).not.toBe('')
      expect(t.meaning, t.id).not.toBe(t.trap)
    }
  })
})
