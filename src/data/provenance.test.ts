import { describe, expect, it } from 'vitest'
import { createEntry } from './wordInput'
import { canFill, hashOf, isUntouched, originOf, originsOf, patchWithSources, withSources } from './provenance'

const base = () => createEntry({ word: 'décider', meaning: 'karar vermek', partOfSpeech: 'verb' }, 'fr', new Date('2026-01-01'))

describe('provenance', () => {
  it('a field a source wrote and nobody changed may be refreshed; an edited one may not', () => {
    const filled = withSources({ ...base(), ipa: '/de.si.de/' }, { ipa: 'wiktionary' })
    expect(isUntouched(filled, 'ipa')).toBe(true)
    expect(canFill(filled, 'ipa')).toBe(true)
    expect(originOf(filled, 'ipa')).toMatchObject({ kind: 'wiktionary' })
    const edited = { ...filled, ipa: '/de.si.de/ (benim düzeltmem)' }
    expect(isUntouched(edited, 'ipa')).toBe(false)
    expect(canFill(edited, 'ipa')).toBe(false)
    expect(originOf(edited, 'ipa')).toEqual({ kind: 'user' })
  })

  it('an empty field can always be filled, and has no origin', () => {
    expect(canFill(base(), 'etymology')).toBe(true)
    expect(originOf(base(), 'etymology')).toBeNull()
  })

  it('a value with no record is "unknown", not claimed by anyone', () => {
    expect(originOf({ ...base(), ipa: '/x/' }, 'ipa')).toEqual({ kind: 'unknown' })
    expect(canFill({ ...base(), ipa: '/x/' }, 'ipa')).toBe(false)
  })

  it('clearing a field drops its record', () => {
    const filled = withSources({ ...base(), etymology: 'Latince decidere' }, { etymology: 'pack' })
    expect(filled.sources?.etymology).toBeDefined()
    const cleared = withSources({ ...filled, etymology: undefined }, { etymology: 'pack' })
    expect(cleared.sources?.etymology).toBeUndefined()
  })

  it('a patch carries the records of the fields it writes and keeps the others', () => {
    const e = withSources({ ...base(), ipa: '/a/' }, { ipa: 'wiktionary' })
    const patch = patchWithSources(e, { synonyms: ['trancher'] }, { synonyms: 'pack' })
    const next = { ...e, ...patch }
    expect(next.sources?.ipa).toEqual(e.sources?.ipa)
    expect(isUntouched(next, 'synonyms')).toBe(true)
    expect(originsOf(next).map((o) => o.field)).toEqual(['ipa', 'synonyms'])
  })

  it('the fingerprint tells values apart and is stable', () => {
    expect(hashOf(['a', 'b'])).toBe(hashOf(['a', 'b']))
    expect(hashOf(['a', 'b'])).not.toBe(hashOf(['a', 'c']))
    expect(hashOf(undefined)).toBe(hashOf(null))
  })
})
