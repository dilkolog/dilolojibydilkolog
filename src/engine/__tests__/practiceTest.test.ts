import { describe, expect, it } from 'vitest'
import { buildTest, MATCH_GROUP, pointsOf, scoreTest } from '../practiceTest'
import { createRng } from '../rng'
import { buildStatements } from '../trueFalse'
import type { VocabularyEntry } from '../types'
import { CATALOG, EN_CATALOG } from './fixtures'

const words: VocabularyEntry[] = EN_CATALOG

describe('true/false statements', () => {
  it('half true, half false; a false one shows another word\'s meaning, never its own', () => {
    const s = buildStatements(words, words, createRng(2))
    expect(s.filter((x) => !x.isTrue).length).toBe(Math.floor(words.length / 2))
    for (const x of s) {
      if (x.isTrue) expect(x.shown).toBe(x.truth)
      else {
        expect(x.shown).not.toBe(x.truth)
        expect(x.entry.senses.map((y) => y.gloss.toLocaleLowerCase('tr'))).not.toContain(x.shown.toLocaleLowerCase('tr'))
      }
    }
  })

  it('a word with nothing to be confused with is simply true', () => {
    const [only] = words
    expect(buildStatements([only], [only], createRng(1))[0].isTrue).toBe(true)
  })
})

describe('buildTest', () => {
  it('deals the switched-on kinds round the words, and one word is one question', () => {
    const q = buildTest(words, CATALOG, ['choice', 'typed', 'truefalse'], createRng(4))
    expect(q.map((x) => x.kind).slice(0, 3)).toEqual(['choice', 'typed', 'truefalse'])
    expect(q).toHaveLength(words.length)
  })

  it('matching groups several words in one question, worth a point a pair', () => {
    const q = buildTest(words, CATALOG, ['match'], createRng(4))
    const first = q[0]
    expect(first.kind).toBe('match')
    if (first.kind === 'match') {
      expect(first.entries).toHaveLength(MATCH_GROUP)
      expect(new Set(first.meanings.map((m) => m.id))).toEqual(new Set(first.entries.map((e) => e.id)))
      expect(pointsOf(first)).toBe(MATCH_GROUP)
    }
    expect(q.reduce((n, x) => n + pointsOf(x), 0)).toBe(words.length)
  })

  it('a leftover pair of words (too few to match) is asked as choices', () => {
    const q = buildTest(words.slice(0, MATCH_GROUP + 2), CATALOG, ['match'], createRng(4))
    expect(q.map((x) => x.kind)).toEqual(['match', 'choice', 'choice'])
  })
})

describe('scoreTest', () => {
  it('adds points per kind', () => {
    const q = buildTest(words, CATALOG, ['choice', 'truefalse'], createRng(4))
    const got = q.map((_, i) => (i % 2 === 0 ? 1 : 0))
    const s = scoreTest(q, got)
    expect(s.total).toBe(words.length)
    expect(s.points).toBe(Math.ceil(words.length / 2))
    expect(s.byKind.choice?.[0]).toBe(Math.ceil(words.length / 2))
    expect(s.byKind.truefalse?.[0]).toBe(0)
  })
})
