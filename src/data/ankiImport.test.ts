import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AnkiFileError, apkgToText, plainField } from './ankiImport'

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)))

describe('plainField', () => {
  it('drops markup, sound tags and entities', () => {
    expect(plainField('<b>the house</b>&nbsp;[sound:a.mp3]')).toBe('the house')
    expect(plainField('décider<br>de')).toBe('décider de')
    expect(plainField('to decide &amp; choose &#233; <img src="x.png">')).toBe('to decide & choose é')
  })
})

describe('apkgToText', () => {
  // The fixture is a real SQLite file written by Anki's own format: 260 notes (several leaf pages under an
  // interior page) and one note whose back is long enough to spill into overflow pages.
  const lines = apkgToText(fixture('sample.apkg')).split('\n')

  it('reads every note across the b-tree', () => {
    expect(lines).toHaveLength(260)
    expect(lines[0]).toBe('la maison\tthe house')
    expect(lines[1]).toBe('décider de\tto decide & choose')
    expect(lines[100]).toBe('mot101\tmeaning number 101 xxxxxxxxxxxxxxxxxxxx')
  })

  it('reassembles a note stored in overflow pages', () => {
    const big = lines.find((l) => l.startsWith('grande\t'))!
    expect(big).toBe(`grande\t${'lorem ipsum '.repeat(600).trim()}`)
  })

  it('reads the same notes from a package packed with zstd (newer Anki)', () => {
    expect(apkgToText(fixture('zstd.apkg')).split('\n')).toEqual(lines)
  })

  it('explains a compressed package it cannot unpack instead of failing blindly', () => {
    expect(() => apkgToText(fixture('modern.apkg'))).toThrow(/Eski Anki sürümlerini destekle/)
  })

  it('rejects files that are not packages', () => {
    expect(() => apkgToText(new Uint8Array([1, 2, 3]))).toThrow(AnkiFileError)
  })
})
