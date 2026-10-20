import { describe, expect, it } from 'vitest'
import { readerStyle, type ReaderPrefs } from './readerSettings'

const prefs = (over: Partial<ReaderPrefs> = {}): ReaderPrefs => ({ size: 1, airy: false, sepia: false, sans: false, width: 1, ...over })

describe('readerStyle', () => {
  it('adds a class for each comfort setting that is on, and none for the defaults', () => {
    expect(readerStyle(prefs()).className).toBe('')
    expect(readerStyle(prefs({ sepia: true, airy: true, sans: true, width: 2 })).className).toBe(' reader-sepia reader-airy reader-sans reader-wide')
    expect(readerStyle(prefs({ width: 0 })).className).toBe(' reader-narrow')
  })
  it('hands the text size over as a variable', () => {
    expect(readerStyle(prefs({ size: 3 })).style['--reader-size']).toBe('1.625rem')
  })
})
