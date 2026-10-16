import { describe, expect, it, vi } from 'vitest'
import type { VocabularyEntry } from '../../engine/types'
import type { KelimeDB } from '../db'
import { linkEntries } from '../familyLinks'

function makeWord(id: string, lemma: string, gloss: string): VocabularyEntry {
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
    senses: [{ id: `${id}#1`, gloss, examples: [] }],
    collocations: [],
    relations: [],
    wordFamily: [],
  }
}

describe('familyLinks linkEntries', () => {
  it('links two unlinked entries mutually', async () => {
    const wordA = makeWord('fr:ami', 'ami', 'arkadaş')
    const wordB = makeWord('fr:amitié', 'amitié', 'arkadaşlık')

    const db = {
      vocabulary: {
        get: vi.fn(async (id: string) => (id === wordA.id ? wordA : wordB)),
        update: vi.fn(async () => 1),
      },
    } as unknown as KelimeDB

    await linkEntries(db, wordA, wordB)

    expect(db.vocabulary.update).toHaveBeenCalledTimes(2)
    expect(db.vocabulary.update).toHaveBeenCalledWith('fr:ami', {
      wordFamily: [
        {
          lemma: 'amitié',
          partOfSpeech: 'noun',
          gloss: 'arkadaşlık',
          entryId: 'fr:amitié',
        },
      ],
    })
    expect(db.vocabulary.update).toHaveBeenCalledWith('fr:amitié', {
      wordFamily: [
        {
          lemma: 'ami',
          partOfSpeech: 'noun',
          gloss: 'arkadaş',
          entryId: 'fr:ami',
        },
      ],
    })
  })

  it('does not re-link if the words are already in each other wordFamily', async () => {
    const wordA: VocabularyEntry = {
      ...makeWord('fr:ami', 'ami', 'arkadaş'),
      wordFamily: [
        {
          lemma: 'amitié',
          partOfSpeech: 'noun',
          gloss: 'arkadaşlık',
          entryId: 'fr:amitié',
        },
      ],
    }
    const wordB: VocabularyEntry = {
      ...makeWord('fr:amitié', 'amitié', 'arkadaşlık'),
      wordFamily: [
        {
          lemma: 'ami',
          partOfSpeech: 'noun',
          gloss: 'arkadaş',
          entryId: 'fr:ami',
        },
      ],
    }

    const db = {
      vocabulary: {
        get: vi.fn(async (id: string) => (id === wordA.id ? wordA : wordB)),
        update: vi.fn(async () => 1),
      },
    } as unknown as KelimeDB

    await linkEntries(db, wordA, wordB)

    expect(db.vocabulary.update).not.toHaveBeenCalled()
  })
})
