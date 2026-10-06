// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { scoreCorpus } from './corpus'
import { KelimeDB } from './db'
import { originOf, withSources } from './provenance'
import { createEntry } from './wordInput'

describe('rating the saved sentences', () => {
  it('puts the sentences that fit first and keeps the source note for an untouched list', async () => {
    const db = new KelimeDB('t-score-1')
    const e = withSources(
      {
        ...createEntry({ word: 'maison', meaning: 'ev', partOfSpeech: 'noun' }, 'fr', new Date()),
        corpus: [
          { text: 'Cette maison abandonnée dissimule mystérieusement beaucoup', translation: '', form: 'maison' },
          { text: 'La maison est grande', translation: '', form: 'maison' },
        ],
      },
      { corpus: 'tatoeba' },
    )
    await db.vocabulary.put(e)
    expect(await scoreCorpus(db, 'fr')).toBe(1)
    const saved = (await db.vocabulary.get(e.id))!
    expect(saved.corpus![0].text).toBe('La maison est grande')
    expect(saved.corpus!.every((x) => x.fit !== undefined)).toBe(true)
    expect(originOf(saved, 'corpus')).toMatchObject({ kind: 'tatoeba' })
    // Nothing left to rate.
    expect(await scoreCorpus(db, 'fr')).toBe(0)
  })
})
