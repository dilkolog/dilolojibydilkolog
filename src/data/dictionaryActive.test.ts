import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { buildIndex, search, typoDistance } from './dictionary'
import { dictionaryForms } from './dictionaryForms'
import { loadTenses } from './tenseData'
import { KelimeDB } from './db'
import { createEntry } from './wordInput'
import { saveDictionarySentence } from './dictionarySentence'

it('finds accent corrections and transposed or mistyped letters without replacing exact/Turkish matches', () => {
  const fr = buildIndex({ v: 'test', w: { fenêtre: { t: ['pencere'] }, maison: { t: ['ev'] }, pain: { t: ['ekmek'] } } }, 'fr')
  expect(search(fr, 'fenetre').correction).toBe('fenêtre')
  expect(search(fr, 'maiosn').suggestions?.[0].word).toBe('maison')
  expect(search(fr, 'maisom').suggestions?.[0].word).toBe('maison')
  expect(search(fr, 'ev').suggestions).toBeUndefined()
  expect(search(fr, 'maison').suggestions).toBeUndefined()
  expect(search(fr, 'zzzzzz').suggestions).toBeUndefined()
  expect(typoDistance('maiosn', 'maison')).toBe(1)
  const es = buildIndex({ v: 'test', w: { niño: { t: ['çocuk'] } } }, 'es')
  expect(search(es, 'nino').exact?.word).toBe('niño')
})

describe('dictionary morphology', () => {
  it('recognizes English irregular forms without assigning an invented person', () => {
    expect(dictionaryForms('en', 'went')).toContainEqual({ lemma: 'go', note: 'Past simple · geçmiş zaman' })
    expect(dictionaryForms('en', 'gone')[0].note).toContain('participle')
  })
  it('keeps ambiguous verbs/tenses and separates validated attached pronouns', async () => {
    await Promise.all([loadTenses('fr'), loadTenses('es')])
    expect(dictionaryForms('fr', 'suis').map(f => f.lemma)).toEqual(expect.arrayContaining(['être', 'suivre']))
    expect(dictionaryForms('es', 'fuiste').map(f => f.lemma)).toEqual(expect.arrayContaining(['ir', 'ser']))
    expect(dictionaryForms('es', 'había').some(f => f.lemma === 'haber')).toBe(true)
    for (const [language, typed, lemma, pronouns] of [
      ['es', 'dímelo', 'decir', ['me', 'lo']],
      ['es', 'hacerlo', 'hacer', ['lo']],
      ['es', 'ayúdame', 'ayudar', ['me']],
      ['fr', "donne-m'en", 'donner', ['me', 'en']],
      ['fr', 'vas-y', 'aller', ['y']],
    ] as const) {
      expect(dictionaryForms(language, typed), typed).toEqual(expect.arrayContaining([expect.objectContaining({ lemma, pronouns: [...pronouns] })]))
    }
    expect(dictionaryForms('fr', 'vas-y')[0].tense).toBe('imperatif')
    expect(dictionaryForms('es', 'caramelo')).toEqual([])
  }, 20000)
})

it('saves a personal example with the latest entry, and never persists invalid input or an incomplete new word', async () => {
  const db = new KelimeDB('dictionary-personal-test')
  const entry = createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date())
  try {
    await db.vocabulary.put({ ...entry, notes: 'newer note' })
    await saveDictionarySentence(db, entry, 'Mon chat dort.')
    const saved = (await db.vocabulary.get(entry.id))!
    expect(saved.notes).toBe('newer note')
    expect(saved.senses[0].examples[0]).toMatchObject({ text: 'Mon chat dort.', personal: true, form: 'chat' })
    const fresh = createEntry({ word: 'chien', meaning: 'köpek' }, 'fr', new Date())
    await expect(saveDictionarySentence(db, fresh, 'Je dors.')).rejects.toThrow()
    expect(await db.vocabulary.get(fresh.id)).toBeUndefined()
    await saveDictionarySentence(db, fresh, 'Mon chien dort.')
    expect((await db.vocabulary.get(fresh.id))?.senses[0].examples[0].personal).toBe(true)
  } finally { await db.delete() }
})
