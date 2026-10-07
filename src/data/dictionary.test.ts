import { describe, expect, it } from 'vitest'
import { buildIndex, fold, search, wiktionaryUrl } from './dictionary'
import type { Pack } from './wordpackBuild'

// Most frequent first, as the pack is built.
const FR: Pack = {
  v: 't',
  w: {
    maison: { t: ['ev', 'hane'], x: { en: ['house'] } },
    décider: { t: ['karar vermek', 'seçmek'], i: '/de.si.de/' },
    décision: { t: ['karar'] },
    décembre: { t: ['aralık'] },
    courir: { t: ['koşmak'] },
    domicile: { t: ['ev', 'ikametgâh'] },
    karaoké: { t: ['karaoke'] },
  },
}
const ix = buildIndex(FR, 'fr')
const words = (hits: { word: string }[]) => hits.map((h) => h.word)

describe('dictionary search', () => {
  it('folds case, accents and the dotless i', () => {
    expect(fold(' Décider ')).toBe('decider')
    expect(fold('KOŞMAK')).toBe('kosmak')
    expect(fold('IŞIK')).toBe('isik')
  })

  it('finds the word with or without its article and accents', () => {
    expect(search(ix, 'maison').exact?.word).toBe('maison')
    expect(search(ix, 'la maison').exact?.word).toBe('maison')
    expect(search(ix, 'DECIDER').exact).toMatchObject({ word: 'décider', rank: 2 })
    expect(search(ix, 'zzz').exact).toBeUndefined()
  })

  it('suggests words that start the same way, most frequent first, without the word itself', () => {
    expect(words(search(ix, 'déc').similar)).toEqual(['décider', 'décision', 'décembre'])
    expect(words(search(ix, 'décider').similar)).toEqual([])
  })

  it('looks Turkish up: the exact meaning first, then a whole word of it, then a beginning', () => {
    expect(words(search(ix, 'ev').fromTurkish)).toEqual(['maison', 'domicile'])
    // "karar" is décision's meaning and a word of décider's "karar vermek".
    expect(words(search(ix, 'karar').fromTurkish)).toEqual(['décision', 'décider'])
    expect(words(search(ix, 'kosmak').fromTurkish)).toEqual(['courir'])
    // Two letters are not enough for a beginning ("ka" would match half the pack).
    expect(words(search(ix, 'ka').fromTurkish)).toEqual([])
    // All three only start with it: frequency decides.
    expect(words(search(ix, 'kara').fromTurkish)).toEqual(['décider', 'décision', 'karaoké'])
  })

  it('takes side senses only when they are the meaning exactly', () => {
    const pack: Pack = {
      v: 't',
      w: {
        souris: { t: ['fare', 'sıçan', 'keme', 'ev faresi'] },
        foyer: { t: ['ocak', 'ev'] },
        maison: { t: ['ev'] },
        demeure: { t: ['konak', 'malikâne', 'ev'] },
      },
    }
    const r = search(buildIndex(pack, 'fr'), 'ev')
    // Exact meanings first, the word's main meaning before a later one; "ev faresi", fourth, is left out.
    expect(words(r.fromTurkish)).toEqual(['maison', 'foyer', 'demeure'])
  })

  it('does not repeat the exact word among the Turkish matches', () => {
    // "karaoke" is both a French word and the Turkish meaning of it.
    const r = search(ix, 'karaoke')
    expect(r.exact?.word).toBe('karaoké')
    expect(words(r.fromTurkish)).toEqual([])
  })

  it('returns nothing for an empty query', () => {
    expect(search(ix, '  ')).toEqual({ similar: [], fromTurkish: [] })
  })

  it('links to the word on Wiktionary at its language', () => {
    expect(wiktionaryUrl('décider', 'fr')).toBe('https://en.wiktionary.org/wiki/d%C3%A9cider#French')
  })
})
