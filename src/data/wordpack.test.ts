// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { KelimeDB } from './db'
import { createEntry } from './wordInput'
import { isUntouched, originOf, withSources } from './provenance'
import { applyPack, packKeys, packRecord, packUpdate } from './wordpack'
import { PackBuilder, packStats, shortEtymology, type WtEntry } from './wordpackBuild'

/** Lines shaped like Wiktextract's output, cut down to what the builder reads. */
const DUMP: WtEntry[] = [
  {
    word: 'decide',
    lang_code: 'en',
    pos: 'verb',
    etymology_text: 'From Middle English deciden, from Old French decider, from Latin dēcīdō. Further notes that run on and on.',
    sounds: [{ ipa: '/dɪˈsaɪd/' }, { mp3_url: 'https://upload.example/En-us-decide.mp3' }],
    senses: [{ glosses: ['to make a choice'], synonyms: [{ word: 'resolve' }] }],
    translations: [
      { lang_code: 'fr', word: 'décider', sense: 'to make a choice' },
      { lang_code: 'es', word: 'decidir', sense: 'to make a choice' },
      { lang_code: 'tr', word: 'karar vermek', sense: 'to make a choice' },
      { lang_code: 'tr', word: 'hükmetmek', sense: 'to rule' },
      { lang_code: 'fr', word: 'trancher', sense: 'to rule' },
    ],
  },
  { word: 'décider', lang_code: 'fr', pos: 'verb', etymology_text: 'Du latin decidere.', sounds: [{ ipa: '\\de.si.de\\' }], senses: [{ glosses: ['to decide'], synonyms: [{ word: 'trancher' }], antonyms: [{ word: 'hésiter' }] }] },
  { word: 'décidé', lang_code: 'fr', pos: 'verb', senses: [{ glosses: ['past participle of décider'], form_of: [{ word: 'décider' }] }], sounds: [{ ipa: '/should-not-be-used/' }] },
  { word: 'decidir', lang_code: 'es', pos: 'verb', sounds: [{ ipa: '/de.θiˈdiɾ/' }], senses: [{ glosses: ['to decide'] }] },
  { word: 'Maison', lang_code: 'de', senses: [{ glosses: ['x'] }] },
]

const built = () => {
  const b = new PackBuilder()
  for (const line of DUMP) b.add(line)
  return b
}

describe('building a pack from a Wiktextract dump', () => {
  it('pivots through English: a French word gets its Turkish meaning and its Spanish and English forms', () => {
    const fr = built().finish('fr', ['décider', 'trancher'], 'v1').w
    expect(fr['décider'].t).toEqual(['karar vermek'])
    expect(fr['décider'].x).toEqual({ en: ['decide'], es: ['decidir'] })
    // The other table row ("to rule") is its own meaning: trancher gets hükmetmek, not karar vermek.
    expect(fr['trancher'].t).toEqual(['hükmetmek'])
    expect(fr['trancher'].x).toEqual({ en: ['decide'] })
  })

  it('takes pronunciation, recording, origin and relations from the word\'s own entry', () => {
    const en = built().finish('en', ['decide'], 'v1').w.decide
    expect(en.i).toBe('/dɪˈsaɪd/')
    expect(en.a).toBe('https://upload.example/En-us-decide.mp3')
    expect(en.e).toBe('From Middle English deciden, from Old French decider, from Latin dēcīdō. Further notes that run on and on.')
    expect(en.s).toEqual(['resolve'])
    expect(en.t).toEqual(['karar vermek', 'hükmetmek'])
    const fr = built().finish('fr', ['décider'], 'v1').w['décider']
    expect(fr.i).toBe('\\de.si.de\\')
    expect(fr.n).toEqual(['hésiter'])
  })

  it('ignores inflected forms and other languages', () => {
    const fr = built().finish('fr', ['décidé', 'maison'], 'v1').w
    expect(fr).toEqual({})
  })

  it('keeps only the wanted words, most wanted first, up to the limit, and reports coverage', () => {
    const pack = built().finish('fr', ['décider', 'trancher'], 'v1', 1)
    expect(Object.keys(pack.w)).toEqual(['décider'])
    const stats = packStats(pack)
    expect(stats.words).toBe(1)
    expect(stats.coverage.t).toBe(1)
    expect(stats.coverage.x).toBe(1)
    expect(stats.coverage.a).toBe(0)
  })

  it('cuts an etymology at a sentence', () => {
    expect(shortEtymology('A short one. Another short one.')).toBe('A short one. Another short one.')
    const long = `${'word '.repeat(30)}end. ${'more '.repeat(30)}end.`
    expect(shortEtymology(long)!.length).toBeLessThanOrEqual(220)
    expect(shortEtymology('')).toBeUndefined()
  })
})

const pack = () => built().finish('fr', ['décider'], 'v1')

describe('using a pack for the learner\'s words', () => {
  it('finds a word as typed, with its article or the reflexive pronoun', () => {
    expect(packKeys("s'asseoir", 'fr')).toContain('asseoir')
    expect(packKeys('la maison', 'fr')).toContain('maison')
    expect(packKeys('to decide', 'en')).toContain('decide')
    expect(packRecord(pack(), 'Décider', 'fr')?.t).toEqual(['karar vermek'])
    expect(packRecord(undefined, 'décider', 'fr')).toBeUndefined()
  })

  it('fills empty fields and leaves the learner\'s own text alone', () => {
    const e = createEntry({ word: 'décider', meaning: 'karar vermek', partOfSpeech: 'verb' }, 'fr', new Date())
    const filled = packUpdate(e, packRecord(pack(), 'décider', 'fr')!)!
    expect(filled.patch.ipa).toBe('\\de.si.de\\')
    expect(filled.patch.etymology).toBe('Du latin decidere.')
    expect(filled.patch.translations).toEqual({ en: ['decide'], es: ['decidir'] })
    expect(filled.wrote.ipa).toBe('pack')
    // The learner already wrote their own pronunciation: it stays.
    const own = { ...e, ipa: '/benim/' }
    expect(packUpdate(own, packRecord(pack(), 'décider', 'fr')!)!.patch.ipa).toBeUndefined()
  })

  it('refreshes a value it wrote itself, but not once it has been edited', () => {
    const e = createEntry({ word: 'décider', meaning: 'karar vermek', partOfSpeech: 'verb' }, 'fr', new Date())
    const first = withSources({ ...e, etymology: 'old text' }, { etymology: 'pack' })
    expect(packUpdate(first, { e: 'Du latin decidere.' })!.patch.etymology).toBe('Du latin decidere.')
    const edited = { ...first, etymology: 'old text, and my note' }
    expect(packUpdate(edited, { e: 'Du latin decidere.' })).toBeUndefined()
  })

  it('fills a whole language once per pack version', async () => {
    const db = new KelimeDB('t-pack-1')
    await db.vocabulary.bulkPut([
      createEntry({ word: 'décider', meaning: 'karar vermek', partOfSpeech: 'verb' }, 'fr', new Date()),
      createEntry({ word: 'inconnu', meaning: 'bilinmeyen', partOfSpeech: 'adjective' }, 'fr', new Date()),
    ])
    expect(await applyPack(db, 'fr', pack())).toBe(1)
    const e = (await db.vocabulary.toArray()).find((x) => x.lemma === 'décider')!
    expect(e.ipa).toBe('\\de.si.de\\')
    expect(isUntouched(e, 'ipa')).toBe(true)
    expect(originOf(e, 'ipa')).toMatchObject({ kind: 'pack' })
    expect(await applyPack(db, 'fr', pack())).toBe(0)
    // A newer pack with a corrected pronunciation updates it, since nobody edited it.
    const newer = { v: 'v2', w: { décider: { i: '/de.si.de/' } } }
    expect(await applyPack(db, 'fr', newer)).toBe(1)
    expect((await db.vocabulary.toArray()).find((x) => x.lemma === 'décider')!.ipa).toBe('/de.si.de/')
    // The learner edits it; the next pack leaves it.
    await db.vocabulary.update(e.id, { ipa: '/mon-ipa/' })
    expect(await applyPack(db, 'fr', { v: 'v3', w: { décider: { i: '/autre/' } } })).toBe(0)
    expect((await db.vocabulary.toArray()).find((x) => x.lemma === 'décider')!.ipa).toBe('/mon-ipa/')
  })
})
