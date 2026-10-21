import { describe, expect, it } from 'vitest'
import { buildIndex, endingGuesses, fold, search, turkishBases, wiktionaryUrl, wordOfTheDay } from './dictionary'
import type { Pack } from './wordpackBuild'
import { createEntry } from './wordInput'

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

  it('takes an inflected form to the word it belongs to, and says so', () => {
    const pack: Pack = { v: 't', w: { aller: { t: ['gitmek'] }, maison: { t: ['ev'] } }, f: { allons: 'aller', vont: 'aller', maisons: 'maison' } }
    const r = search(buildIndex(pack, 'fr'), 'allons')
    expect(r.exact?.word).toBe('aller')
    expect(r.form).toBe('allons')
    expect(search(buildIndex(pack, 'fr'), 'les maisons').exact?.word).toBe('maison')
    // A word that is itself in the pack is never taken for a form.
    expect(search(buildIndex(pack, 'fr'), 'maison').form).toBeUndefined()
  })

  it('takes a form the pack lacks to its verb through the verb tables, and says which form', () => {
    const pack: Pack = { v: 't', w: { renunciar: { t: ['vazgeçmek'] }, comer: { t: ['yemek'] } } }
    const tables = (w: string) => (w === 'renuncio' ? [{ lemma: 'renunciar', note: 'presente, yo' }] : w === 'comimos' ? [{ lemma: 'nadaquí', note: 'x' }, { lemma: 'comer', note: 'pretérito indefinido, nosotros' }] : [])
    const r = search(buildIndex(pack, 'es'), 'renuncio', tables)
    expect(r).toMatchObject({ exact: { word: 'renunciar' }, form: 'renuncio', formNote: 'presente, yo' })
    // The first verb the dictionary has.
    expect(search(buildIndex(pack, 'es'), 'comimos', tables).exact?.word).toBe('comer')
    // Without the tables (not loaded yet), nothing is guessed.
    expect(search(buildIndex(pack, 'es'), 'renuncio').exact).toBeUndefined()
  })

  it('shows a word of its own that is also a form, and points to the word it is a form of', () => {
    const pack: Pack = { v: 't', w: { aller: { t: ['gitmek'] }, allons: { t: ['haydi'] } }, f: { allons: 'aller' } }
    const r = search(buildIndex(pack, 'fr'), 'allons')
    expect(r.exact?.word).toBe('allons')
    expect(r.form).toBeUndefined()
    expect(r.alsoFormOf).toBe('aller')
  })

  it('returns nothing for an empty query', () => {
    expect(search(ix, '  ')).toEqual({ similar: [], fromTurkish: [] })
  })

  it('links to the word on Wiktionary at its language', () => {
    expect(wiktionaryUrl('décider', 'fr')).toBe('https://en.wiktionary.org/wiki/d%C3%A9cider#French')
  })

  it('finds an inflected Turkish word by its root', () => {
    const pack: Pack = { v: 't', w: { maison: { t: ['ev'] }, aller: { t: ['gitmek'] }, livre: { t: ['kitap'] }, venir: { t: ['gelmek'] } } }
    const ix2 = buildIndex(pack, 'fr')
    expect(words(search(ix2, 'evler').fromTurkish)).toEqual(['maison'])
    expect(search(ix2, 'evlerde').turkishAs).toBe('ev')
    expect(words(search(ix2, 'gittim').fromTurkish)).toEqual(['aller'])
    expect(search(ix2, 'gidiyorum').turkishAs).toBe('gitmek')
    expect(words(search(ix2, 'kitabı').fromTurkish)).toEqual(['livre'])
    expect(words(search(ix2, 'geleceğim').fromTurkish)).toEqual(['venir'])
    // A word found as typed needs no root.
    expect(search(ix2, 'kitap').turkishAs).toBeUndefined()
  })

  it('takes suffixes off a Turkish word, at most two, and tries the root as a verb', () => {
    const bases = turkishBases('gidiyorum')
    expect(bases).toContain('gitmek')
    expect(turkishBases('evlerde')).toContain('ev')
    expect(turkishBases('evlerde')[0]).toBe('evler')
  })

  it('indexes personal vocabulary: finds user words by lemma, prefix, and Turkish meaning', () => {
    const pack: Pack = { v: 't', w: { maison: { t: ['ev'] } } }
    const custom = createEntry({ word: 'ornithorynque', meaning: 'ornitorenk', partOfSpeech: 'noun' }, 'fr', new Date())
    const existing = createEntry({ word: 'maison', meaning: 'ev, yuva', partOfSpeech: 'noun' }, 'fr', new Date())
    const ixUser = buildIndex(pack, 'fr', [custom, existing])

    // Exact match for user-added word not in pack
    const hitCustom = search(ixUser, 'ornithorynque')
    expect(hitCustom.exact?.word).toBe('ornithorynque')
    expect(hitCustom.exact?.isOwn).toBe(true)
    expect(hitCustom.exact?.rec.t).toEqual(['ornitorenk'])

    // Word already in pack is marked isOwn
    const hitPack = search(ixUser, 'maison')
    expect(hitPack.exact?.word).toBe('maison')
    expect(hitPack.exact?.isOwn).toBe(true)

    // Prefix search includes user word
    const hitPrefix = search(ixUser, 'orni')
    expect(words(hitPrefix.similar)).toContain('ornithorynque')

    // Turkish search finds user-added word
    const hitTr = search(ixUser, 'ornitorenk')
    expect(words(hitTr.fromTurkish)).toContain('ornithorynque')
    expect(hitTr.fromTurkish.find((h) => h.word === 'ornithorynque')?.isOwn).toBe(true)

    // Custom meaning added by user for an existing word is indexed
    const hitYuva = search(ixUser, 'yuva')
    expect(words(hitYuva.fromTurkish)).toContain('maison')
  })

  it('builds the pack part once: a changed word list reuses it, and the pack is left untouched', () => {
    const pack: Pack = { v: 't', w: { maison: { t: ['ev'] }, chat: { t: ['kedi'] } } }
    const plain = buildIndex(pack, 'fr')
    const withOwn = buildIndex(pack, 'fr', [createEntry({ word: 'ornithorynque', meaning: 'ornitorenk' }, 'fr', new Date())])
    expect(buildIndex(pack, 'fr').turkish).toBe(plain.turkish)
    expect(withOwn.keys).toEqual(['maison', 'chat', 'ornithorynque'])
    expect(plain.keys).toEqual(['maison', 'chat'])
    expect(Object.keys(pack.w)).toEqual(['maison', 'chat'])
    expect(search(plain, 'ornitorenk').fromTurkish).toEqual([])
    // A word of another language, or one listed twice, doesn't change the index twice.
    const twice = buildIndex(pack, 'fr', [createEntry({ word: 'le loup', meaning: 'kurt' }, 'fr', new Date()), createEntry({ word: 'loup', meaning: 'kurt' }, 'fr', new Date()), createEntry({ word: 'wolf', meaning: 'kurt' }, 'en', new Date())])
    expect(twice.keys.filter((k) => k === 'loup')).toHaveLength(1)
    expect(words(search(twice, 'kurt').fromTurkish)).toEqual(['loup'])
  })
})


describe('the day\'s word', () => {
  const words = Object.fromEntries(
    Array.from({ length: 600 }, (_, i) => [`mot${i}`, i % 3 === 0 ? { t: ['kelime'] } : { t: [`anlam ${i}`], p: 'n' }]),
  )
  const pack: Pack = { v: 't', w: words }

  it('is a common word past the first few hundred, with a meaning and a part of speech, the same all day', () => {
    const index = buildIndex(pack, 'fr')
    const day = wordOfTheDay(index, 20261014)!
    expect(day.rank).toBeGreaterThan(300)
    expect(day.rec.p).toBe('n')
    expect(wordOfTheDay(index, 20261014)?.word).toBe(day.word)
    const week = new Set([14, 15, 16, 17, 18, 19, 20].map((d) => wordOfTheDay(index, 20261000 + d)?.word))
    expect(week.size).toBeGreaterThan(3)
  })

  it('passes over the words already in the learner\'s list', () => {
    const plain = wordOfTheDay(buildIndex(pack, 'fr'), 7)!
    const own = createEntry({ word: plain.word, meaning: 'x' }, 'fr', new Date())
    expect(wordOfTheDay(buildIndex(pack, 'fr', [own]), 7)?.word).not.toBe(plain.word)
  })
})

describe('a form without a Turkish meaning of its own', () => {
  // As in the real packs: the forms are keys of their own with no `t`, and `f` maps them to their word.
  const ES: Pack = {
    v: 't',
    w: {
      poder: { t: ['yapabilmek', '-ebilmek'], p: 'v' },
      puede: {},
      mujer: { t: ['kadın'], p: 'n' },
      mujeres: {},
      pequeño: { t: ['küçük'], p: 'a' },
      pequeña: {},
      canción: { t: ['şarkı'], p: 'n' },
      canciones: {},
      haber: { p: 'v' },
      había: { p: 'v' },
      chocar: { p: 'v' },
    },
    f: { puede: 'poder', mujeres: 'mujer', había: 'haber' },
  }
  const es = buildIndex(ES, 'es')
  const EN: Pack = { v: 't', w: { woman: { t: ['kadın'] }, women: {}, year: { t: ['yıl'] }, years: { p: 'n' }, city: { t: ['şehir'] }, cities: {} }, f: { women: 'woman' } }
  const en = buildIndex(EN, 'en')

  it('gives the word it belongs to, from the pack’s form table', () => {
    expect(search(es, 'puede').baseOf).toEqual({ word: 'poder', t: ['yapabilmek', '-ebilmek'] })
    expect(search(es, 'mujeres').baseOf).toEqual({ word: 'mujer', t: ['kadın'] })
    expect(search(en, 'women').baseOf).toEqual({ word: 'woman', t: ['kadın'] })
  })

  it('from the verb tables, with the form', () => {
    const verbs = (w: string) => (w === 'puede' ? [{ lemma: 'poder', note: 'presente, él' }] : [])
    const noTable = buildIndex({ ...ES, f: {} }, 'es')
    expect(search(noTable, 'puede', verbs).baseOf).toEqual({ word: 'poder', t: ['yapabilmek', '-ebilmek'], note: 'presente, él' })
  })

  it('from plural and feminine endings, only when the guess has a meaning', () => {
    expect(search(es, 'pequeña').baseOf?.word).toBe('pequeño')
    expect(search(es, 'canciones').baseOf?.word).toBe('canción')
    expect(search(en, 'years').baseOf?.word).toBe('year')
    expect(search(en, 'cities').baseOf?.word).toBe('city')
    // haber has no meaning either: nothing to show, and no guess made up.
    expect(search(es, 'había').baseOf).toBeUndefined()
    expect(search(es, 'chocar').baseOf).toBeUndefined()
    // A word with its own meaning needs none.
    expect(search(es, 'mujer').baseOf).toBeUndefined()
  })

  it('guesses endings per language', () => {
    expect(endingGuesses('mujeres', 'es')).toContain('mujer')
    expect(endingGuesses('pequeña', 'es')).toContain('pequeño')
    expect(endingGuesses('femmes', 'fr')).toContain('femme')
    expect(endingGuesses('chevaux', 'fr')).toContain('cheval')
    expect(endingGuesses('cities', 'en')).toContain('city')
    expect(endingGuesses('a', 'es')).toEqual([])
  })
})
