// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createEntry } from '../data/wordInput'
import { equivalentsFromPack } from '../data/wordpack'
import { CrossLanguageNotes, OriginNotes } from './CrossLanguage'

const entry = (word: string, meaning: string, extra = {}) => ({ ...createEntry({ word, meaning, partOfSpeech: 'noun' }, 'fr', new Date()), ...extra })

describe('Turkish kin, origins and the languages from the pack', () => {
  it('a word Turkish took from French shows the Turkish word', () => {
    const html = renderToStaticMarkup(<CrossLanguageNotes entry={entry('pantalon', 'pantolon')} />)
    expect(html).toContain('Türkçedeki akrabası')
    expect(html).toContain('pantolon')
  })

  it('says where the Turkish meaning has narrowed', () => {
    expect(renderToStaticMarkup(<CrossLanguageNotes entry={entry('collège', 'ortaokul')} compact />)).toContain('özel okul')
  })

  it('shows nothing for a word with no kin, no look-alike and no false friend', () => {
    expect(renderToStaticMarkup(<CrossLanguageNotes entry={entry('maison', 'ev')} />)).toBe('')
  })

  it('shows origin, synonyms and antonyms when the pack gave them, and nothing otherwise', () => {
    const html = renderToStaticMarkup(<OriginNotes entry={entry('décider', 'karar vermek', { etymology: 'Du latin decidere.', synonyms: ['trancher'], antonyms: ['hésiter'] })} />)
    expect(html).toContain('Köken')
    expect(html).toContain('Du latin decidere.')
    expect(html).toContain('trancher')
    expect(html).toContain('hésiter')
    expect(renderToStaticMarkup(<OriginNotes entry={entry('maison', 'ev')} />)).toBe('')
  })

  it('the three-languages card can be built from what the pack stored, offline', () => {
    const eq = equivalentsFromPack(entry('décider', 'karar vermek', { translations: { en: ['decide'], es: ['decidir'] } }))!
    expect(eq.forms.map((f) => [f.language, f.word])).toEqual([['fr', 'décider'], ['en', 'decide'], ['es', 'decidir']])
    expect(equivalentsFromPack(entry('maison', 'ev'))).toBeNull()
  })
})
