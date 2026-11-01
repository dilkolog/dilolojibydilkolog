import { describe, expect, it } from 'vitest'
import { enrichPack, type MeaningSupplement } from './wordpackEnrichment'
import { PackBuilder } from './wordpackBuild'

const approved: MeaningSupplement = { language: 'en', word: 'unplug', pos: 'v', meanings: ['fişini çekmek'], source: 'Editorial translation', status: 'reviewed', reviewedBy: 'editor' }

describe('reviewed word-pack enrichment', () => {
  it('preserves manual meanings, gender, audio, and examples while filling gaps and adding translated headwords', () => {
    const base = { v: 'old', w: { unplug: { p: 'v', a: 'manual.mp3', c: [['Unplug it.', 'Fişini çek.']] as [string, string][] }, house: { p: 'n', t: ['ev'], g: 'm' as const } } }
    const fresh = { v: 'new', w: { house: { p: 'n', t: ['hane'], g: 'f' as const }, blank: { p: 'n' }, helpful: { p: 'a', t: ['yardımsever'] } } }
    const result = enrichPack(base, fresh, [approved], 'v2')
    expect(result.filled).toBe(1)
    expect(result.added).toBe(1)
    expect(result.pack.w.house).toMatchObject({ t: ['ev'], g: 'm' })
    expect(result.pack.w.unplug).toMatchObject({ t: ['fişini çekmek'], a: 'manual.mp3', c: base.w.unplug.c })
    expect(result.pack.w.blank).toBeUndefined()
    expect(base.w.unplug).not.toHaveProperty('t')
    const twice = enrichPack(result.pack, fresh, [approved], 'v2')
    expect(twice.pack).toEqual(result.pack)
    expect(twice.added + twice.filled).toBe(0)
  })
  it('never publishes drafts and rejects unreviewed or incompatible supplements', () => {
    const base = { v: 'old', w: { unplug: { p: 'v' } } }
    expect(enrichPack(base, undefined, [{ ...approved, status: 'draft' }], 'new').pack.w.unplug.t).toBeUndefined()
    expect(() => enrichPack(base, undefined, [{ ...approved, reviewedBy: '' }], 'new')).toThrow('Invalid reviewed')
    expect(() => enrichPack(base, undefined, [{ ...approved, pos: 'n' }], 'new')).toThrow('conflict')
  })
})

it('keeps noun and verb meanings separate when pivoting through an English homograph', () => {
  const b = new PackBuilder()
  b.add({ word: 'record', lang_code: 'en', pos: 'noun', translations: [{ lang_code: 'fr', word: 'relevé', sense: 'document' }, { lang_code: 'tr', word: 'kayıt belgesi', sense: 'document' }] })
  b.add({ word: 'record', lang_code: 'en', pos: 'verb', translations: [{ lang_code: 'fr', word: 'relevé', sense: 'to store' }, { lang_code: 'tr', word: 'kaydetmek', sense: 'to store' }] })
  b.add({ word: 'relevé', lang_code: 'fr', pos: 'noun', senses: [{ glosses: ['record'] }] })
  expect(b.finish('fr', ['relevé'], 'test').w.relevé.t).toEqual(['kayıt belgesi'])
})

it('does not join unlabelled translations from different senses; expands only translated additional headwords', () => {
  const b = new PackBuilder()
  b.add({ word: 'bank', lang_code: 'en', pos: 'noun', senses: [
    { glosses: ['financial institution'], translations: [{ lang_code: 'fr', word: 'banque' }, { lang_code: 'tr', word: 'banka' }] },
    { glosses: ['edge of a river'], translations: [{ lang_code: 'fr', word: 'rive' }, { lang_code: 'tr', word: 'kıyı' }] },
  ] })
  b.add({ word: 'rive', lang_code: 'fr', pos: 'noun', senses: [{ glosses: ['river bank'] }] })
  b.add({ word: 'unknown', lang_code: 'fr', pos: 'noun', sounds: [{ ipa: 'x' }] })
  expect(b.finish('fr', ['banque'], 'test').w.banque.t).toEqual(['banka'])
  const expanded = b.finish('fr', ['banque'], 'test', 50000, true)
  expect(expanded.w.rive.t).toEqual(['kıyı'])
  expect(expanded.w.unknown).toBeUndefined()
  expect(b.finish('fr', ['banque'], 'test', 1, true).w.rive).toBeUndefined()
})

it('applies an editorial correction only over its exact reviewed predecessor', () => {
  const revision: MeaningSupplement = { ...approved, word: 'ticklish', pos: 'a', replaces: ['gıdıklanan'], meanings: ['gıdıklanmaya hassas'] }
  const corrected = enrichPack({ v: 'old', w: { ticklish: { p: 'a', t: ['gıdıklanan'] } } }, undefined, [revision], 'new')
  expect(corrected.corrected).toBe(1)
  expect(corrected.pack.w.ticklish.t).toEqual(['gıdıklanmaya hassas'])
  expect(enrichPack(corrected.pack, undefined, [revision], 'new').corrected).toBe(0)
  expect(() => enrichPack({ v: 'old', w: { ticklish: { p: 'a', t: ['manually edited'] } } }, undefined, [revision], 'new')).toThrow('Meaning correction conflict')
})
