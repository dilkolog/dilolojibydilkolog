import { describe, expect, it } from 'vitest'
import { idiomItems } from '../ui/words/idiomItems'
import { keyEntries } from '../ui/reading/keyWordsList'
import { EXERCISES } from '../engine/exercises'
import { findIdioms, idiomProblems, loadIdioms, type Idiom } from './idioms'
import type { TargetLanguage } from '../engine/types'

const LANGUAGES: TargetLanguage[] = ['fr', 'es', 'en']

describe('idiom pack', () => {
  it('every idiom of every language passes the checks', async () => {
    for (const language of LANGUAGES) {
      const idioms = await loadIdioms(language)
      expect(idioms.length, language).toBeGreaterThanOrEqual(16)
      expect(idiomProblems(idioms), language).toEqual([])
    }
  })

  it('every idiom makes a card of its own: a phrase, its sentence marked, its level, image and register kept', async () => {
    for (const language of LANGUAGES) {
      const idioms = await loadIdioms(language)
      const entries = keyEntries(idiomItems(idioms), language, new Date(), '')
      expect(entries.length, `${language}: two idioms make the same card`).toBe(idioms.length)
      entries.forEach((e, n) => {
        const i = idioms[n]!
        expect(e.partOfSpeech, i.w).toBe('phrase')
        expect(e.senses[0]!.examples[0]!.form, i.w).toBe(i.form)
        expect([e.cefr, e.literal, e.register], i.w).toEqual([i.level, i.lit, i.reg])
        expect(EXERCISES.idiom_complete.applicable(e), i.w).toBe(true)
      })
    }
  })

  it('the checks catch what a batch gets wrong', () => {
    const good: Idiom = { w: 'ir al grano', t: 'sadede gelmek', lit: 'taneye gitmek', s: 'Vayamos al grano.', form: 'Vayamos al grano', tr: 'Sadede gelelim.', reg: 'neutral', area: 'genel', level: 'B2', theme: 'talk' }
    expect(idiomProblems([good])).toEqual([])
    const bad = (over: Partial<Idiom>) => idiomProblems([{ ...good, ...over }]).length
    expect(bad({ form: 'ir al grano' })).toBe(1)
    expect(bad({ w: 'grano' })).toBe(1)
    expect(bad({ w: 'ir al grano (con algo)' })).toBe(1)
    expect(bad({ lit: 'sadede gelmek' })).toBe(1)
    expect(bad({ theme: 'sports' as Idiom['theme'] })).toBe(1)
    expect(bad({ level: 'A1' as Idiom['level'] })).toBe(1)
    expect(bad({ tr: '' })).toBe(1)
    expect(idiomProblems([good, { ...good, w: 'Ir  al grano' }])).toHaveLength(1)
  })

  it('a card carries how the idiom is built, its Turkish twin and where it is said', () => {
    const [item] = idiomItems([{ w: 'importar un pimiento', pat: 'importarle un pimiento algo a alguien', t: 'hiç umurunda olmamak', lit: 'bir biber kadar önem taşımak', eq: 'vız gelmek', s: 'Me importa un pimiento.', form: 'importa un pimiento', tr: 'Hiç umurumda değil.', reg: 'informal', area: 'İspanya', level: 'B2', theme: 'feelings' }])
    expect(item!.extras).toEqual([
      { label: 'Kalıp', text: 'importarle un pimiento algo a alguien' },
      { label: 'Türkçe deyim', text: 'vız gelmek' },
      { label: 'Nerede', text: 'İspanya' },
    ])
    const [entry] = keyEntries([item!], 'es', new Date(), '')
    expect(entry!.extras).toHaveLength(3)
  })

  it('the dictionary finds an idiom typed whole, as it stands in a sentence, by a word of it and by its Turkish', async () => {
    const es = await loadIdioms('es')
    expect(findIdioms(es, 'tomar el pelo').exact?.w).toBe('tomar el pelo')
    expect(findIdioms(es, '  Tomar  el Pelo ').exact?.w).toBe('tomar el pelo')
    expect(findIdioms(es, 'pasar pagina').exact?.w).toBe('pasar página')
    expect(findIdioms(es, 'tomando el pelo').exact?.w).toBe('tomar el pelo')
    expect(findIdioms(es, 'tomarle el pelo a alguien').exact?.w).toBe('tomar el pelo')
    expect(findIdioms(es, 'pelo').others.map((i) => i.w)).toEqual(expect.arrayContaining(['tomar el pelo']))
    expect(findIdioms(es, 'pelos').others.map((i) => i.w)).toEqual(['no tener pelos en la lengua'])
    expect(findIdioms(es, 'meter').others.map((i) => i.w)).toEqual(['meter la pata'])
    expect(findIdioms(es, 'pot kırmak').others.map((i) => i.w)).toEqual(['meter la pata'])
    expect(findIdioms(es, 'göz yummak').others.map((i) => i.w)).toEqual(['hacer la vista gorda'])
    // Too short to mean anything, and a word no idiom has.
    expect(findIdioms(es, 'el').others).toEqual([])
    expect(findIdioms(es, 'jirafa')).toEqual({ exact: undefined, others: [] })
    const fr = await loadIdioms('fr')
    expect(findIdioms(fr, "l'esprit").others).toEqual([])
    expect(findIdioms(fr, 'etre dans la lune').exact?.w).toBe('être dans la lune')
  })
})

describe('inflected idiom searches', () => {
  const fixture = (w: string): Idiom => ({ w, t: 'özgün test anlamı', lit: 'test imgesi', s: 'Stored example.', form: 'Stored example', tr: 'Örnek.', reg: 'neutral', area: 'genel', level: 'B2', theme: 'talk' })

  it('finds Spanish conjugations, reflexive forms, attached and intervening pronouns', async () => {
    const { loadTenses } = await import('./tenseData')
    await loadTenses('es')
    const idioms = ['darse fatal', 'tomar el pelo', 'meter la pata'].map(fixture)
    for (const [q, w] of [
      ['se me da fatal', 'darse fatal'], ['se te daba fatal', 'darse fatal'],
      ['me tomó el pelo', 'tomar el pelo'], ['te tomarán el pelo', 'tomar el pelo'], ['tú me tomaste el pelo', 'tomar el pelo'],
      ['tomarle el pelo', 'tomar el pelo'], ['hemos metido la pata', 'meter la pata'],
    ]) expect(findIdioms(idioms, q, 8, 'es').exact?.w, q).toBe(w)
    for (const q of ['me cortó el pelo', 'se me da bien', 'me tomó la mano', 'tomó pelo', 'me tomó no el pelo', 'pelo tomó el', 'ayer me tomó el pelo', 'da fatal']) {
      expect(findIdioms(idioms, q, 8, 'es').exact, q).toBeUndefined()
    }
  })

  it('finds French simple and compound tenses with elided and indirect object pronouns', async () => {
    const { loadTenses } = await import('./tenseData')
    await loadTenses('fr')
    const idioms = ['poser un lapin', 'prendre la mouche', "s'arracher les cheveux", 'se creuser la tête'].map(fixture)
    for (const [q, w] of [
      ['elle lui pose un lapin', 'poser un lapin'], ["il m'a posé un lapin", 'poser un lapin'],
      ['nous lui avons posé un lapin', 'poser un lapin'], ['tu prends la mouche', 'prendre la mouche'],
      ['elle a pris la mouche', 'prendre la mouche'], ['je me creuse la tête', 'se creuser la tête'],
      ["je m'arrache les cheveux", "s'arracher les cheveux"],
    ]) expect(findIdioms(idioms, q, 8, 'fr').exact?.w, q).toBe(w)
    for (const q of ['il mange un lapin', 'elle prend la tête', 'elle ne prend pas la mouche', 'pris mouche', 'un lapin pose', 'je creuse la tête']) {
      expect(findIdioms(idioms, q, 8, 'fr').exact, q).toBeUndefined()
    }
  })

  it('finds English irregular past, regular -ing/-ed and simple auxiliaries', () => {
    const idioms = ['take the plunge', "pull someone's leg", 'spill the beans', 'bite the bullet'].map(fixture)
    for (const [q, w] of [
      ['took the plunge', 'take the plunge'], ['she takes the plunge', 'take the plunge'],
      ['pulling my leg', "pull someone's leg"], ['he was pulling your leg', "pull someone's leg"],
      ['has spilled the beans', 'spill the beans'], ['she spilled the beans', 'spill the beans'],
      ['he bit the bullet', 'bite the bullet'],
    ]) expect(findIdioms(idioms, q, 8, 'en').exact?.w, q).toBe(w)
    for (const q of ['pulled the beans', 'has cooked the beans', 'has not spilled the beans', 'the beans spilled', 'take plunge', 'pulling the leg', 'taked the plunge', 'has took the plunge', 'has pulling my leg', 'took 12 the plunge']) {
      expect(findIdioms(idioms, q, 8, 'en').exact, q).toBeUndefined()
    }
  })

  it('requires two content words and preserves exact, partial-word and Turkish searches', () => {
    for (const [w, q] of [['under the weather', 'undered the weather'], ['piece of cake', 'piecing of cake'], ['blessing in disguise', 'blessinging in disguise']]) {
      expect(findIdioms([fixture(w)], q, 8, 'en').exact, q).toBeUndefined()
    }
    expect(findIdioms([fixture('be on it')], 'was on it', 8, 'en').exact).toBeUndefined()
    expect(findIdioms([fixture('pull leg')], 'pulling arm', 8, 'en').exact).toBeUndefined()
    expect(findIdioms([fixture('take the plunge')], 'takes the plunge').exact?.w).toBe('take the plunge')
    expect(findIdioms([fixture('tomar el pelo')], 'tomar el pelo', 8, 'es').exact?.w).toBe('tomar el pelo')
    expect(findIdioms([fixture('tomar el pelo')], 'pelo', 8, 'es').others).toHaveLength(1)
    expect(findIdioms([fixture('tomar el pelo')], 'özgün test anlamı', 8, 'es').others).toHaveLength(1)
  })
})
