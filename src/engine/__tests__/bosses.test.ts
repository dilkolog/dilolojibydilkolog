import { describe, expect, it } from 'vitest'
import { BOSS_XP, DAMAGE, findBosses, PLAYER_HEARTS, type BossWin } from '../bosses'
import type { Mistake, UserWordState, VocabularyEntry } from '../types'

function makeEntry(id: string, lemma: string): VocabularyEntry {
  return {
    id,
    language: 'fr',
    lemma,
    partOfSpeech: 'noun',
    cefr: 'A1',
    frequencyRank: 100,
    register: 'neutral',
    tags: [],
    source: 'sample',
    senses: [{ id: `${id}-s1`, gloss: `${lemma} tr`, examples: [] }],
    collocations: [],
    relations: [],
    wordFamily: [],
  }
}

function makeState(entryId: string, stats: Partial<UserWordState['stats']>): UserWordState {
  return {
    entryId,
    language: 'fr',
    introducedAt: new Date('2026-10-15'),
    skills: {},
    stats: {
      reviews: 10,
      correct: 7,
      wrong: 0,
      hints: 0,
      totalResponseMs: 1000,
      consecutiveWrong: 0,
      ...stats,
    },
  }
}

describe('bosses engine', () => {
  it('exposes balance constants', () => {
    expect(DAMAGE.choice).toBe(1)
    expect(DAMAGE.typed).toBe(2)
    expect(PLAYER_HEARTS).toBe(3)
    expect(BOSS_XP).toBe(40)
  })

  it('identifies leeches based on high error ratio', () => {
    const vocab = [makeEntry('w1', 'pomme')]
    const states = [makeState('w1', { wrong: 3, reviews: 10 })] // 3/10 = 0.3
    const bosses = findBosses(vocab, states, [], [])

    expect(bosses).toHaveLength(1)
    expect(bosses[0].entry.lemma).toBe('pomme')
    expect(bosses[0].hp).toBe(7) // 4 + min(6, 3) = 7
    expect(bosses[0].rematch).toBe(false)
  })

  it('identifies leeches based on consecutive errors', () => {
    const vocab = [makeEntry('w2', 'maison')]
    const states = [makeState('w2', { wrong: 2, reviews: 20, consecutiveWrong: 2 })]
    const bosses = findBosses(vocab, states, [], [])

    expect(bosses).toHaveLength(1)
    expect(bosses[0].entry.id).toBe('w2')
    expect(bosses[0].hp).toBe(6) // 4 + min(6, 2)
  })

  it('identifies leeches based on open mistakes', () => {
    const vocab = [makeEntry('w3', 'chien')]
    const states = [makeState('w3', { wrong: 1, reviews: 10, consecutiveWrong: 0 })]
    const mistakes: Mistake[] = [
      { id: 'm1', entryId: 'w3', errorType: 'meaning', exerciseType: 'mc_meaning', given: 'x', expected: 'chien', count: 1, firstAt: new Date(), lastAt: new Date(), correctSince: 0, resolved: false },
      { id: 'm2', entryId: 'w3', errorType: 'meaning', exerciseType: 'typed_translation', given: 'y', expected: 'chien', count: 1, firstAt: new Date(), lastAt: new Date(), correctSince: 0, resolved: false },
    ]
    const bosses = findBosses(vocab, states, mistakes, [])

    expect(bosses).toHaveLength(1)
    expect(bosses[0].entry.id).toBe('w3')
  })

  it('ignores non-leech words', () => {
    const vocab = [makeEntry('w4', 'soleil')]
    const states = [makeState('w4', { wrong: 1, reviews: 10, consecutiveWrong: 0 })]
    const bosses = findBosses(vocab, states, [], [])

    expect(bosses).toHaveLength(0)
  })

  it('filters out beaten bosses unless they accrued more wrong answers', () => {
    const vocab = [makeEntry('w5', 'eau')]
    const states = [makeState('w5', { wrong: 4, reviews: 10 })]
    const wins: BossWin[] = [{ entryId: 'w5', at: '2026-10-15T12:00:00Z', wrongAtWin: 4 }]

    // Beaten with 4 wrong, still 4 wrong -> no boss
    expect(findBosses(vocab, states, [], wins)).toHaveLength(0)

    // Made a new mistake after win (wrong is now 5 > 4) -> rematch!
    const updatedStates = [makeState('w5', { wrong: 5, reviews: 11 })]
    const rematchBosses = findBosses(vocab, updatedStates, [], wins)
    expect(rematchBosses).toHaveLength(1)
    expect(rematchBosses[0].rematch).toBe(true)
    expect(rematchBosses[0].hp).toBe(9) // 4 + min(6, 5)
  })

  it('orders bosses by wrong count descending and respects limit', () => {
    const vocab = [makeEntry('w1', 'un'), makeEntry('w2', 'deux'), makeEntry('w3', 'trois')]
    const states = [
      makeState('w1', { wrong: 3, reviews: 5 }),
      makeState('w2', { wrong: 6, reviews: 10 }),
      makeState('w3', { wrong: 4, reviews: 8 }),
    ]
    const bosses = findBosses(vocab, states, [], [], 2)

    expect(bosses).toHaveLength(2)
    expect(bosses[0].entry.id).toBe('w2') // wrong: 6
    expect(bosses[1].entry.id).toBe('w3') // wrong: 4
  })
})
