import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createEntry } from '../data/wordInput'
import { WordLabel } from './WordLabel'

const entry = (word: string, extra = {}) => ({ ...createEntry({ word, meaning: 'x', partOfSpeech: 'noun' }, 'fr', new Date()), ...extra })

describe('a word as written in a list', () => {
  it('shows the gender-tinted article and the lemma in the word\'s language', () => {
    const html = renderToStaticMarkup(<WordLabel entry={entry('la maison')} />)
    expect(html).toContain('lang="fr"')
    expect(html).toContain('gender-f')
    expect(html).toContain('maison')
  })

  it('adds the hard-word bolt, and the part of speech only when asked', () => {
    expect(renderToStaticMarkup(<WordLabel entry={entry('maison', { difficult: true })} />)).toContain('difficult-mark')
    expect(renderToStaticMarkup(<WordLabel entry={entry('maison')} />)).not.toContain('pos-tag')
    expect(renderToStaticMarkup(<WordLabel entry={entry('maison')} pos />)).toContain('pos-tag')
    expect(renderToStaticMarkup(<WordLabel entry={{ ...entry('xyz'), partOfSpeech: 'other' }} pos />)).not.toContain('pos-tag')
  })
})
