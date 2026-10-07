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

  it('re-rates every word once the list has grown enough, since learned words are no longer unknown', async () => {
    const db = new KelimeDB('t-score-2')
    const now = new Date()
    const hard = 'Cette maison dissimule mystérieusement tout'
    const e = { ...createEntry({ word: 'maison', meaning: 'ev', partOfSpeech: 'noun' }, 'fr', now), corpus: [{ text: hard, translation: '', form: 'maison' }] }
    await db.vocabulary.put(e)
    await scoreCorpus(db, 'fr')
    const fitOf = async () => (await db.vocabulary.get(e.id))!.corpus![0].fit
    const before = await fitOf()
    expect(before).toBeGreaterThanOrEqual(2)

    // The learner adds the two hard words and 7 more: 10 words, not yet enough to redo the ratings (1 + 10).
    const add = (word: string) => db.vocabulary.put(createEntry({ word, meaning: 'x' }, 'fr', now))
    for (const w of ['dissimuler', 'dissimule', 'mystérieusement', 'aa', 'bb', 'cc', 'dd', 'ee', 'ff']) await add(w)
    expect(await scoreCorpus(db, 'fr')).toBe(0)
    expect(await fitOf()).toBe(before)

    // One more makes 11: every saved list is rated again, and the sentence got easier.
    await add('gg')
    expect(await scoreCorpus(db, 'fr')).toBe(1)
    expect(await fitOf()).toBe(before! - 2)
    // Nothing changes on the next run.
    expect(await scoreCorpus(db, 'fr')).toBe(0)
  })
})
