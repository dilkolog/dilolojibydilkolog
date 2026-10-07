// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { KelimeDB } from './db'
import { createEntry } from './wordInput'
import { isUntouched, originOf, withSources } from './provenance'
import { applyPack, packKeys, packRecord, packUpdate } from './wordpack'
import { glossHeads, nounGender, turkishEquivalents, PackBuilder, packStats, shortEtymology, type WtEntry } from './wordpackBuild'

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

  it('puts the meaning the word’s own entry gives first, whatever order the English entries came in', () => {
    const b = new PackBuilder()
    // English entries arrive alphabetically: "close" (correr las cortinas) before "run".
    b.add({ word: 'close', lang_code: 'en', senses: [{ glosses: ['to shut'], translations: [{ lang_code: 'tr', word: 'kapatmak', sense: 'to shut' }, { lang_code: 'es', word: 'correr', sense: 'to shut' }] }] })
    b.add({ word: 'run', lang_code: 'en', senses: [{ glosses: ['to move fast'], translations: [{ lang_code: 'tr', word: 'koşmak', sense: 'to move fast' }, { lang_code: 'es', word: 'correr', sense: 'to move fast' }, { lang_code: 'fr', word: 'courir', sense: 'to move fast' }] }] })
    b.add({ word: 'correr', lang_code: 'es', senses: [{ glosses: ['to run, to jog (quickly)'] }, { glosses: ['to draw (curtains); to close'] }] })
    const es = b.finish('es', ['correr'], 'v1').w.correr
    expect(es.t).toEqual(['koşmak', 'kapatmak'])
    expect(es.x).toEqual({ en: ['run', 'close'], fr: ['courir'] })
  })

  it('leaves out the translations of vulgar or offensive senses', () => {
    const b = new PackBuilder()
    b.add({
      word: 'screw',
      lang_code: 'en',
      senses: [
        { glosses: ['to fasten with a screw'], translations: [{ lang_code: 'tr', word: 'vidalamak', sense: 'fasten' }, { lang_code: 'es', word: 'atornillar', sense: 'fasten' }] },
        { glosses: ['to have sex with'], tags: ['vulgar'], translations: [{ lang_code: 'tr', word: 'kaba', sense: 'sex' }, { lang_code: 'es', word: 'coger', sense: 'sex' }] },
      ],
    })
    b.add({ word: 'damn', lang_code: 'en', senses: [{ glosses: ['x'], tags: ['offensive'] }], translations: [{ lang_code: 'tr', word: 'lanet', sense: 'x' }] })
    expect(b.finish('en', ['screw', 'damn'], 'v1').w.screw.t).toEqual(['vidalamak'])
    expect(b.finish('en', ['damn'], 'v1').w.damn).toBeUndefined()
    expect(b.finish('es', ['coger'], 'v1').w.coger).toBeUndefined()
  })

  it('reads the English equivalents out of glosses', () => {
    expect(glossHeads(['to run, to jog (quickly)', 'to draw (curtains); to close'])).toEqual(['run', 'jog', 'draw', 'close'])
    expect(glossHeads(['a house', 'something long and complicated that is not one word at all'])).toEqual(['house'])
  })

  it('reads translation tables kept on each sense, as newer dumps do', () => {
    const b = new PackBuilder()
    b.add({
      word: 'choose',
      lang_code: 'en',
      senses: [
        { glosses: ['to pick'], translations: [{ lang_code: 'tr', word: 'seçmek', sense: 'to pick' }, { lang_code: 'fr', word: 'choisir', sense: 'to pick' }] },
        { glosses: ['to elect'], translations: [{ code: 'tr', word: 'seçmek', sense: 'to elect' }, { lang_code: 'es', word: 'elegir', sense: 'to elect' }] },
      ],
    })
    expect(b.finish('en', ['choose'], 'v1').w.choose.t).toEqual(['seçmek'])
    const fr = b.finish('fr', ['choisir'], 'v1').w.choisir
    expect(fr.t).toEqual(['seçmek'])
    expect(fr.x).toEqual({ en: ['choose'] })
    expect(b.finish('es', ['elegir'], 'v1').w.elegir.x).toEqual({ en: ['choose'] })
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

  it('an inflected form brings in the word it belongs to, with that word\'s data, and is kept for searching', () => {
    const pack = built().finish('fr', ['décidé', 'maison'], 'v1')
    // décidé is a form of décider: décider comes in at its rank; the form's own entry gives nothing.
    expect(Object.keys(pack.w)).toEqual(['décider'])
    expect(pack.w['décider'].i).toBe('\\de.si.de\\')
    expect(pack.f).toEqual({ décidé: 'décider' })
    // Maison is a German line in this dump: other languages are ignored.
    expect(pack.w.maison).toBeUndefined()
  })

  it('keeps the link for a word that is also a form of another (Allons ! and aller)', () => {
    const b = new PackBuilder()
    b.add({ word: 'aller', lang_code: 'fr', pos: 'verb', senses: [{ glosses: ['to go'] }] })
    b.add({ word: 'allons', lang_code: 'fr', pos: 'intj', sounds: [{ ipa: '/a.lɔ̃/' }], senses: [{ glosses: ["let's go!"] }, { glosses: ['first-person plural of aller'], form_of: [{ word: 'aller' }] }] })
    // Only when aller is itself a frequent word.
    expect(b.finish('fr', ['allons'], 'v1').f).toBeUndefined()
    const pack = b.finish('fr', ['allons', 'aller'], 'v1')
    expect(Object.keys(pack.w)).toEqual(['allons', 'aller'])
    expect(pack.f).toEqual({ allons: 'aller' })
  })

  it('counts a word brought in by its form only once, and against the limit', () => {
    const pack = built().finish('fr', ['décidé', 'décider', 'trancher'], 'v1', 1)
    expect(Object.keys(pack.w)).toEqual(['décider'])
    expect(pack.f).toEqual({ décidé: 'décider' })
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

describe('part of speech and gender', () => {
  const noun = (word: string, lang: string, g: string): WtEntry => ({ word, lang_code: lang, pos: 'noun', senses: [{ glosses: ['x'] }], head_templates: [{ name: `${lang}-noun`, args: { '1': g } }] })

  it('reads a noun\'s gender from its headword template', () => {
    expect(nounGender(noun('casa', 'es', 'f'), 'es')).toBe('f')
    expect(nounGender(noun('gafas', 'es', 'f-p'), 'es')).toBe('f')
    expect(nounGender(noun('capital', 'es', 'mfbysense'), 'es')).toBe('e')
    expect(nounGender(noun('chose', 'fr', '?'), 'fr')).toBeUndefined()
    // A French template is not read for a Spanish word.
    expect(nounGender(noun('casa', 'fr', 'f'), 'es')).toBeUndefined()
  })

  it('takes the main entry\'s part of speech and gender, not a later one or an inflected form', () => {
    const b = new PackBuilder()
    b.add({ word: 'casa', lang_code: 'es', pos: 'verb', senses: [{ glosses: ['third-person of casar'], form_of: [{ word: 'casar' }] }] })
    b.add(noun('livre', 'fr', 'm'))
    b.add(noun('livre', 'fr', 'f'))
    b.add(noun('casa', 'es', 'f'))
    b.add({ word: 'maison', lang_code: 'fr', pos: 'adj', senses: [{ glosses: ['homemade'] }] })
    b.add({ word: 'house', lang_code: 'en', pos: 'noun', senses: [{ glosses: ['a building'] }], head_templates: [{ name: 'en-noun', args: {} }] })
    expect(b.finish('fr', ['livre', 'maison'], 'v1').w).toMatchObject({ livre: { p: 'n', g: 'm' }, maison: { p: 'a' } })
    expect(b.finish('es', ['casa'], 'v1').w.casa).toMatchObject({ p: 'n', g: 'f' })
    expect(b.finish('en', ['house'], 'v1').w.house).toEqual({ p: 'n' })
  })

  it('fills a word saved as "other" and a noun without gender, never over the learner\'s choice', () => {
    const now = new Date()
    const other = createEntry({ word: 'casa', meaning: 'ev' }, 'es', now)
    expect(other.partOfSpeech).toBe('other')
    expect(packUpdate(other, { p: 'n', g: 'f' })?.patch).toMatchObject({ partOfSpeech: 'noun', gender: 'f' })
    // A verb the learner chose stays a verb, and gets no gender.
    const verb = createEntry({ word: 'casa', meaning: 'evlenir', partOfSpeech: 'verb' }, 'es', now)
    expect(packUpdate(verb, { p: 'n', g: 'f' })).toBeUndefined()
    // "el problema": the article already said masculine.
    const masc = createEntry({ word: 'el problema', meaning: 'sorun', partOfSpeech: 'noun' }, 'es', now)
    expect(masc.gender).toBe('m')
    expect(packUpdate(masc, { p: 'n', g: 'f' })).toBeUndefined()
    // English nouns have no gender.
    expect(packUpdate(createEntry({ word: 'house', meaning: 'ev' }, 'en', now), { p: 'n', g: 'f' })?.patch).toEqual({ partOfSpeech: 'noun' })
  })
})

describe('Turkish Wiktionary', () => {
  it('keeps the short Turkish equivalents of a gloss, not a definition or a note about a form', () => {
    expect(turkishEquivalents('ev, konut')).toEqual(['ev', 'konut'])
    expect(turkishEquivalents('karar vermek (bir konuda); seçmek.')).toEqual(['karar vermek', 'seçmek'])
    expect(turkishEquivalents('aller sözcüğünün çekimi:')).toEqual([])
    expect(turkishEquivalents('bir kişinin veya ailenin içinde yaşadığı yer, içinde insanların yaşadığı yapı')).toEqual([])
    // A name, an English expansion, a description of use.
    expect(turkishEquivalents('Bir soyadı')).toEqual([])
    expect(turkishEquivalents('Subject Expert Teams')).toEqual([])
    expect(turkishEquivalents('hâlihazırda anlamı verir')).toEqual([])
  })

  it('puts Turkish editors\' meanings of the main part of speech first, then the pivot, then their other ones, then reverse translations', () => {
    const b = new PackBuilder()
    // English Wiktionary: run is mainly a verb; its table gives "koşmak".
    b.add({ word: 'run', lang_code: 'en', pos: 'verb', senses: [{ glosses: ['to move fast'], translations: [{ lang_code: 'tr', word: 'seyirtmek', sense: 'move' }] }] })
    // Turkish Wiktionary: the noun entry comes first there.
    b.addTurkish({ word: 'run', lang_code: 'en', pos: 'noun', senses: [{ glosses: ['koşu'] }] })
    b.addTurkish({ word: 'run', lang_code: 'en', pos: 'verb', senses: [{ glosses: ['koşmak'] }, { glosses: ['yarışmak'] }] })
    // A Turkish entry listing run in its table.
    b.addTurkish({ word: 'koşturmak', lang_code: 'tr', pos: 'verb', senses: [{ glosses: ['x'] }], translations: [{ lang_code: 'en', word: 'run' }] })
    expect(b.finish('en', ['run'], 'v1').w.run.t).toEqual(['koşmak', 'yarışmak', 'seyirtmek', 'koşu'])
  })

  it('gives a word with no other source its Turkish meaning, and ignores forms and rude senses', () => {
    const b = new PackBuilder()
    b.addTurkish({ word: 'casa', lang_code: 'es', pos: 'noun', senses: [{ glosses: ['ev'] }] })
    b.addTurkish({ word: 'casa', lang_code: 'es', pos: 'name', senses: [{ glosses: ['bir soyadı'] }] })
    b.addTurkish({ word: 'casas', lang_code: 'es', pos: 'noun', senses: [{ glosses: ['casa sözcüğünün çoğulu'], form_of: [{ word: 'casa' }] }] })
    b.addTurkish({ word: 'coger', lang_code: 'es', pos: 'verb', senses: [{ glosses: ['almak'] }, { glosses: ['sikişmek'], tags: ['vulgar'] }] })
    b.addTurkish({ word: 'ev', lang_code: 'tr', pos: 'noun', senses: [{ glosses: ['yapı'] }], translations: [{ lang_code: 'es', word: 'casa' }, { lang_code: 'es', word: 'hogar' }] })
    const w = b.finish('es', ['casa', 'casas', 'coger', 'hogar'], 'v1').w
    expect(w.casa.t).toEqual(['ev'])
    expect(w.casas).toBeUndefined()
    expect(w.coger.t).toEqual(['almak'])
    expect(w.hogar.t).toEqual(['ev'])
  })
})

