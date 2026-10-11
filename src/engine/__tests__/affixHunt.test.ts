import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { POS_CODE, type Pack } from '../../data/wordpackBuild'
import { huntPool, huntQuestionsOf, huntRound } from '../affixHunt'
import type { WordLookup } from '../derive'
import { createRng } from '../rng'
import type { PartOfSpeech } from '../types'

const lex = (entries: Record<string, [PartOfSpeech, string?]>): WordLookup => (w) => (entries[w] ? { pos: entries[w][0], gloss: entries[w][1] } : undefined)

const EN = lex({
  comfort: ['noun', 'konfor'], comfortable: ['adjective', 'rahat'], uncomfortable: ['adjective', 'rahatsız'], comfortably: ['adverb', 'rahatça'],
  discomfort: ['noun'], comforting: ['adjective'], comfortment: ['noun'],
})

describe('huntQuestionsOf', () => {
  it('asks only for derived words with a Turkish meaning, from the word each was built on', () => {
    const qs = huntQuestionsOf('comfort', 'en', EN, createRng(1))
    expect(qs.map((q) => q.id).sort()).toEqual(['comfort|comfortable', 'comfortable|comfortably', 'comfortable|uncomfortable'].sort())
    const q = qs.find((x) => x.word === 'comfortably')!
    expect(q).toMatchObject({ base: 'comfortable', wordGloss: 'rahatça', wordPos: 'adverb' })
    expect(q.answer.form).toBe('ly')
  })

  it('gives the answer among three, the wrong ones never making a word of the base', () => {
    for (const q of huntQuestionsOf('comfort', 'en', EN, createRng(2))) {
      expect(q.options).toHaveLength(3)
      expect(q.options.filter((o) => o.form === q.answer.form)).toHaveLength(1)
      expect(new Set(q.options.map((o) => o.kind)).size).toBe(1)
    }
    // "comfortment" is a word here: -ment is no wrong choice for comfort.
    const able = huntQuestionsOf('comfort', 'en', EN, createRng(3)).find((q) => q.word === 'comfortable')!
    expect(able.options.map((o) => o.form)).not.toContain('ment')
  })
})

describe('huntRound', () => {
  it('asks each base word once and the missed pairs first', () => {
    const qs = huntQuestionsOf('comfort', 'en', EN, createRng(1))
    const log = { 'comfortable|comfortably': { ok: 0, wrong: 5, last: '2026-01-01' }, 'comfort|comfortable': { ok: 9, wrong: 0, last: '2026-01-01' } }
    let first = 0
    for (let s = 1; s <= 40; s++) {
      const round = huntRound(qs, log, createRng(s), 8)
      expect(new Set(round.map((q) => q.base)).size).toBe(round.length)
      if (round[0].id === 'comfortable|comfortably') first++
    }
    expect(first).toBeGreaterThan(10)
  })
})

describe('huntPool', () => {
  it('asks about the roots of missed pairs first', () => {
    const pool = huntPool([], [], 'en', EN, createRng(1), { priority: ['comfortable'], want: 1 })
    expect(pool.map((q) => q.id)).toEqual(['comfortable|comfortably', 'comfortable|uncomfortable'])
  })
})

describe('with the word pack', () => {
  it('builds a round of real questions from frequent words, in each language, quickly', () => {
    for (const language of ['en', 'fr', 'es'] as const) {
      const pack = JSON.parse(readFileSync(`src/data/wordpack/${language}.json`, 'utf8')) as Pack
      const words = readFileSync(`src/data/frequency/${language}.txt`, 'utf8').split('\n').filter(Boolean)
      const lookup: WordLookup = (w) => {
        const r = pack.w[w]
        const pos = r?.p ? POS_CODE[r.p] : undefined
        return pos ? { pos, gloss: r.t?.[0] } : undefined
      }
      const started = Date.now()
      const pool = huntPool([], words, language, lookup, createRng(7))
      expect(pool.length, language).toBeGreaterThanOrEqual(8)
      expect(Date.now() - started, language).toBeLessThan(3000)
      for (const q of pool) {
        expect(q.options.map((o) => o.form), q.id).toContain(q.answer.form)
        expect(q.word, q.id).not.toBe(q.base)
      }
    }
  })
})
