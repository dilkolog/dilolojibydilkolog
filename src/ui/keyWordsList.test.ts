// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { KelimeDB } from '../data/db'
import type { Pack } from '../data/wordpackBuild'
import { addKeyList, keyEntries, packItem, type KeyItem } from './keyWordsList'
import { lastPlacement } from './listMemory'

const items: KeyItem[] = [
  { word: 'décidé', lemma: 'décider', turkish: ['karar vermek', 'kararlaştırmak', 'seçmek'], sentence: 'Il a décidé de partir.', pos: 'verb' },
  { word: 'voisine', lemma: 'voisin', turkish: ['komşu'], sentence: 'Ma voisine chante.', pos: 'noun', gender: 'm' },
  { word: 'brume', lemma: 'brume', turkish: [], sentence: 'La brume monte.' },
  { word: 'décide', lemma: 'décider', turkish: ['karar vermek'], sentence: 'Elle décide vite.' },
]

describe('the key words of a text as a list', () => {
  beforeEach(() => localStorage.clear())

  it('makes cards only for words with a meaning, once each, with the sentence met in', () => {
    const out = keyEntries(items, 'fr', new Date(), 'Le Petit Prince')
    expect(out.map((e) => e.lemma)).toEqual(['décider', 'voisin'])
    expect(out[0].senses[0].gloss).toContain('karar vermek')
    expect(out[0].senses[0].examples[0]).toMatchObject({ text: 'Il a décidé de partir.', form: 'décidé', metIn: 'Le Petit Prince' })
    expect(out[1]).toMatchObject({ partOfSpeech: 'noun', gender: 'm' })
  })

  it('puts them in a list named after the text, reuses it, leaves words already there, and makes it where new words go', async () => {
    const db = new KelimeDB(`t-keylist-${Math.random()}`)
    const [own] = keyEntries([items[1]], 'fr', new Date())
    await db.vocabulary.put(own)
    const first = await addKeyList(db, 'fr', 'Le Petit Prince', items)
    expect(first.list.name).toBe('Le Petit Prince')
    expect(first.added.map((e) => e.lemma)).toEqual(['décider'])
    expect((await db.vocabulary.get(first.added[0].id))?.listId).toBe(first.list.id)
    expect((await db.vocabulary.get(own.id))?.listId).toBeUndefined()
    expect(lastPlacement('fr')).toBe(first.list.id)
    const again = await addKeyList(db, 'fr', 'le petit prince', items)
    expect(again.list.id).toBe(first.list.id)
    expect(again.added).toEqual([])
    expect(await db.getLists('fr')).toHaveLength(1)
  })

  it('reads a word from the pack: its dictionary form, meaning, and a sentence that shows it', () => {
    const pack: Pack = {
      v: '1',
      w: {
        aller: { t: ['gitmek'], p: 'v', c: [['Il pleut.', 'Yağmur yağıyor.'], ['Nous allons à Paris.', "Paris'e gidiyoruz."]] },
        maison: { t: ['ev'], p: 'n', g: 'f' },
        brume: {},
      },
      f: { allons: 'aller' },
    }
    expect(packItem(pack, 'allons', 'fr')).toMatchObject({ lemma: 'aller', word: 'allons', turkish: ['gitmek'], pos: 'verb', sentence: 'Nous allons à Paris.', translation: "Paris'e gidiyoruz." })
    expect(packItem(pack, 'maison', 'fr')).toMatchObject({ lemma: 'maison', sentence: '', pos: 'noun', gender: 'f' })
    expect(packItem(pack, 'brume', 'fr')).toBeUndefined()
    expect(packItem(undefined, 'maison', 'fr')).toBeUndefined()
    const [entry] = keyEntries([packItem(pack, 'allons', 'fr')!], 'fr', new Date())
    expect(entry.senses[0].examples[0]).toMatchObject({ text: 'Nous allons à Paris.', form: 'allons', translation: "Paris'e gidiyoruz." })
    expect(entry.senses[0].examples[0].metIn).toBeUndefined()
  })
})
