import { describe, expect, it } from 'vitest'
import { createRng } from '../rng'
import { recordGrammar } from '../grammar'
import { trapOf, trapQuestion, trapRound, type TrapWord } from '../traps'

const word = (lemma: string, meaning: string, trap: string, language: TrapWord['language'] = 'fr'): TrapWord => ({
  id: `${language}-${lemma}`,
  language,
  lemma,
  looks: 'x',
  trap,
  meaning,
  text: `Phrase avec ${lemma}.`,
  tr: 'Cümle.',
  source: 'test',
})
const ALL = [word('actuellement', 'şu anda', 'aslında'), word('librairie', 'kitapçı', 'kütüphane'), word('coin', 'köşe', 'madeni para'), word('pain', 'ekmek', 'acı'), word('sensible', 'duyarlı', 'mantıklı', 'es')]

describe('trapOf', () => {
  it('finds a word by language and lemma, case aside', () => {
    expect(trapOf(ALL, 'fr', 'Actuellement')?.meaning).toBe('şu anda')
    expect(trapOf(ALL, 'fr', 'sensible')).toBeUndefined()
    expect(trapOf(ALL, 'es', 'sensible')?.meaning).toBe('duyarlı')
  })

  it('does not mind accents either way: the page of "collège" finds the entry written "college"', () => {
    const list = [word('college', 'ortaokul', 'üniversite'), word('déception', 'hayal kırıklığı', 'aldatma')]
    expect(trapOf(list, 'fr', 'collège')?.meaning).toBe('ortaokul')
    expect(trapOf(list, 'fr', 'deception')?.meaning).toBe('hayal kırıklığı')
  })
})

describe('trapQuestion', () => {
  it('offers the meaning, the trap and another word’s meaning, shuffled, none twice', () => {
    for (let seed = 1; seed < 10; seed++) {
      const q = trapQuestion(ALL[0], ALL, createRng(seed))
      expect(q.options).toHaveLength(3)
      expect(new Set(q.options).size).toBe(3)
      expect(q.options).toContain('şu anda')
      expect(q.options).toContain('aslında')
      // The third is another French word's meaning, never the Spanish one.
      expect(q.options.filter((o) => !['şu anda', 'aslında'].includes(o))[0]).not.toBe('duyarlı')
    }
  })

  it('has two choices when there is no other word', () => {
    expect(trapQuestion(ALL[0], [ALL[0]], createRng(1)).options).toHaveLength(2)
  })
})

describe('trapRound', () => {
  it('asks only the language’s words, each once, the missed first', () => {
    const log = recordGrammar({}, 'fr-coin', false, new Date())
    const lead = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) {
      const round = trapRound(ALL, log, 'fr', createRng(seed), 4)
      expect(round.map((q) => q.word.language)).toEqual(['fr', 'fr', 'fr', 'fr'])
      expect(new Set(round.map((q) => q.id)).size).toBe(4)
      lead.add(round[0].id)
    }
    expect(lead.has('fr-coin')).toBe(true)
  })
})
