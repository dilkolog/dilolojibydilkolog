// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createEntry } from '../data/wordInput'
import { WordPopExtras } from './WordPopExtras'

describe('the word card in a reading', () => {
  it('names the Turkish word that came from the tapped word', () => {
    const html = renderToStaticMarkup(<WordPopExtras language="fr" lemma="pantalon" />)
    expect(html).toContain('Türkçedeki akrabası')
    expect(html).toContain('pantolon')
  })

  it('shows the origin of a word that is in the list, and says nothing for a plain word', () => {
    const e = { ...createEntry({ word: 'décider', meaning: 'karar vermek', partOfSpeech: 'verb' }, 'fr', new Date()), etymology: 'Du latin decidere.' }
    expect(renderToStaticMarkup(<WordPopExtras language="fr" lemma="décider" entry={e} />)).toContain('Du latin decidere.')
    expect(renderToStaticMarkup(<WordPopExtras language="fr" lemma="maison" />)).toBe('')
  })
})
