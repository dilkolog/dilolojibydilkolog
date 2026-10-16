import { describe, expect, it } from 'vitest'
import type { VocabularyEntry } from '../../engine/types'
import { makeLookup } from '../deriveLookup'
import type { Pack } from '../wordpackBuild'

function makeTestPack(): Pack {
  return {
    v: '1',
    w: {
      pomme: {
        p: 'n', // noun
        t: ['elma'],
      },
      rouge: {
        p: 'a', // adjective ('a')
        t: ['kırmızı'],
      },
    },
  }
}

function makeUserWord(id: string, lemma: string): VocabularyEntry {
  return {
    id,
    language: 'fr',
    lemma,
    partOfSpeech: 'verb',
    cefr: 'A1',
    frequencyRank: 200,
    register: 'neutral',
    tags: [],
    source: 'user',
    senses: [{ id: `${id}-s1`, gloss: 'yürümek', examples: [] }],
    collocations: [],
    relations: [],
    wordFamily: [],
  }
}

describe('deriveLookup makeLookup', () => {
  it('looks up words present in the pack', () => {
    const pack = makeTestPack()
    const rank = new Map<string, number>([['pomme', 450], ['rouge', 120]])
    const lookup = makeLookup(pack, rank, [], 'fr')

    const pomme = lookup('pomme')
    expect(pomme).toBeDefined()
    expect(pomme?.pos).toBe('noun')
    expect(pomme?.gloss).toBe('elma')
    expect(pomme?.rank).toBe(450)

    const rouge = lookup('rouge')
    expect(rouge).toBeDefined()
    expect(rouge?.pos).toBe('adjective')
    expect(rouge?.gloss).toBe('kırmızı')
    expect(rouge?.rank).toBe(120)
  })

  it('falls back to the learner vocabulary for words not in the pack', () => {
    const pack = makeTestPack()
    const rank = new Map<string, number>([['marcher', 800]])
    const vocab = [makeUserWord('fr:marcher', 'marcher')]
    const lookup = makeLookup(pack, rank, vocab, 'fr')

    const marcher = lookup('marcher')
    expect(marcher).toBeDefined()
    expect(marcher?.pos).toBe('verb')
    expect(marcher?.gloss).toBe('yürümek')
    expect(marcher?.rank).toBe(800)
  })

  it('returns undefined for unknown words', () => {
    const pack = makeTestPack()
    const lookup = makeLookup(pack, new Map(), [], 'fr')

    expect(lookup('inconnu')).toBeUndefined()
  })

  it('ignores multi-word lemmas and partOfSpeech "other" in learner vocab', () => {
    const pack = makeTestPack()
    const vocab: VocabularyEntry[] = [
      {
        ...makeUserWord('fr:pomme_de_terre', 'pomme de terre'),
        partOfSpeech: 'noun',
      },
      {
        ...makeUserWord('fr:xyz', 'xyz'),
        partOfSpeech: 'other',
      },
    ]
    const lookup = makeLookup(pack, new Map(), vocab, 'fr')

    expect(lookup('pomme de terre')).toBeUndefined()
    expect(lookup('xyz')).toBeUndefined()
  })
})
