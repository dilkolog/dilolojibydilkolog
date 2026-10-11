import { describe, expect, it } from 'vitest'
import { stripDiacritics } from '../engine/answerCheck'
import { trapWords } from './traps'

describe('the false friends', () => {
  it('are in each language, with unique ids and everything filled in', () => {
    for (const l of ['fr', 'es', 'en']) expect(trapWords.filter((t) => t.language === l).length, l).toBeGreaterThanOrEqual(9)
    expect(new Set(trapWords.map((t) => t.id)).size).toBe(trapWords.length)
    for (const t of trapWords) {
      // The id is the key of the learner's log: it stays as first written (without accents) when the lemma gets them.
      expect(stripDiacritics(t.id.toLowerCase()), t.id).toBe(`${t.language}-${stripDiacritics(t.lemma.toLowerCase())}`)
      for (const k of ['lemma', 'looks', 'trap', 'meaning', 'text', 'tr', 'source'] as const) expect(t[k].trim(), `${t.id}.${k}`).not.toBe('')
      expect(t.meaning, t.id).not.toBe(t.trap)
      // What the chip and the round show: plain words, no glosses in brackets, no "only" in front of the trap.
      expect(t.looks, `${t.id}.looks`).not.toMatch(/[()]/)
      expect(t.meaning, `${t.id}.meaning`).not.toMatch(/\((?:veya|isimden)/)
      expect(t.trap, `${t.id}.trap`).not.toMatch(/^(?:yalnızca|sadece)\s/)
    }
  })
})
