import { describe, expect, it } from 'vitest'
import { languageOf, parseCsv, readTranslateExport } from './translateImport'

describe('Google Translate import', () => {
  it('parses quoted CSV with commas, quotes and line breaks', () => {
    expect(parseCsv('a,"b, c","say ""hi""",\n"x\ny",z\n')).toEqual([['a', 'b, c', 'say "hi"', ''], ['x\ny', 'z']])
    expect(parseCsv('﻿a;b;c;d')).toEqual([['a', 'b', 'c', 'd']])
  })

  it('recognises language names in several interface languages', () => {
    expect(languageOf('French')).toBe('fr')
    expect(languageOf('İspanyolca')).toBe('es')
    expect(languageOf('Türkçe')).toBe('tr')
    expect(languageOf('Detect language')).toBeNull()
  })

  it('keeps the foreign side, Turkish as meaning; long ones become sentences', () => {
    const csv = [
      'French,Turkish,dépaysement,yabancılık hissi',
      'Türkçe,İspanyolca,karar vermek,tomar una decisión',
      'English,Turkish,I have never been to Paris before.,Daha önce hiç Paris’e gitmedim.',
      'English,German,house,Haus',
      'Detect language,Turkish,xyz,abc',
    ].join('\n')
    const r = readTranslateExport(csv)
    expect(r.items).toEqual([
      { language: 'fr', text: 'dépaysement', turkish: 'yabancılık hissi', kind: 'word' },
      { language: 'es', text: 'tomar una decisión', turkish: 'karar vermek', kind: 'word' },
      { language: 'en', text: 'I have never been to Paris before.', turkish: 'Daha önce hiç Paris’e gitmedim.', kind: 'sentence' },
    ])
    expect(r.skipped).toBe(2)
  })
})
