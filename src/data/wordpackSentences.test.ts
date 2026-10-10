import { describe, expect, it } from 'vitest'
import { examplesFromPack, packColumnarSentences, packTsvSentences, unpackSentences } from './wordpack'
import type { PackRecord } from './wordpackBuild'

describe('wordpack example sentences formats', () => {
  const pairs: [string, string][] = [
    ['Je suis allé au marché ce matin.', 'Bu sabah pazara gittim.'],
    ['Nous parlons français et espagnol.', 'Fransızca ve İspanyolca konuşuyoruz.'],
  ]

  const expectedExamples = [
    { text: 'Je suis allé au marché ce matin.', translation: 'Bu sabah pazara gittim.', form: '' },
    { text: 'Nous parlons français et espagnol.', translation: 'Fransızca ve İspanyolca konuşuyoruz.', form: '' },
  ]

  it('packs tuples into columnar format { s, t } and tsv string', () => {
    const columnar = packColumnarSentences(pairs)
    expect(columnar).toEqual({
      s: ['Je suis allé au marché ce matin.', 'Nous parlons français et espagnol.'],
      t: ['Bu sabah pazara gittim.', 'Fransızca ve İspanyolca konuşuyoruz.'],
    })

    const tsv = packTsvSentences(pairs)
    expect(tsv).toBe('Je suis allé au marché ce matin.\tBu sabah pazara gittim.\nNous parlons français et espagnol.\tFransızca ve İspanyolca konuşuyoruz.')
  })

  it('unpacks legacy row tuple format, new columnar format and tsv string to identical pairs', () => {
    const legacyRow: PackRecord['c'] = [
      ['Je suis allé au marché ce matin.', 'Bu sabah pazara gittim.'],
      ['Nous parlons français et espagnol.', 'Fransızca ve İspanyolca konuşuyoruz.'],
    ]

    const newColumnar: PackRecord['c'] = {
      s: ['Je suis allé au marché ce matin.', 'Nous parlons français et espagnol.'],
      t: ['Bu sabah pazara gittim.', 'Fransızca ve İspanyolca konuşuyoruz.'],
    }

    const tsvString: PackRecord['c'] =
      'Je suis allé au marché ce matin.\tBu sabah pazara gittim.\nNous parlons français et espagnol.\tFransızca ve İspanyolca konuşuyoruz.'

    const fromLegacy = unpackSentences(legacyRow)
    const fromColumnar = unpackSentences(newColumnar)
    const fromTsv = unpackSentences(tsvString)

    expect(fromLegacy).toEqual(pairs)
    expect(fromColumnar).toEqual(pairs)
    expect(fromTsv).toEqual(pairs)
  })

  it('produces identical Example objects from both legacy and columnar representations', () => {
    const legacyRow: PackRecord['c'] = [
      ['Je suis allé au marché ce matin.', 'Bu sabah pazara gittim.'],
      ['Nous parlons français et espagnol.', 'Fransızca ve İspanyolca konuşuyoruz.'],
    ]

    const newColumnar: PackRecord['c'] = packColumnarSentences(pairs)
    const tsvString: PackRecord['c'] = packTsvSentences(pairs)

    const examplesLegacy = examplesFromPack(legacyRow)
    const examplesColumnar = examplesFromPack(newColumnar)
    const examplesTsv = examplesFromPack(tsvString)

    expect(examplesLegacy).toEqual(expectedExamples)
    expect(examplesColumnar).toEqual(expectedExamples)
    expect(examplesTsv).toEqual(expectedExamples)
  })

  it('handles empty, nullish or whitespace values defensively', () => {
    expect(unpackSentences(undefined)).toBeUndefined()
    expect(unpackSentences([] as unknown as PackRecord['c'])).toBeUndefined()
    expect(unpackSentences('')).toBeUndefined()
    expect(unpackSentences('   ')).toBeUndefined()

    expect(examplesFromPack(undefined)).toBeUndefined()
    expect(examplesFromPack([] as unknown as PackRecord['c'])).toBeUndefined()
    expect(examplesFromPack('')).toBeUndefined()
    expect(examplesFromPack('   ')).toBeUndefined()
  })
})
