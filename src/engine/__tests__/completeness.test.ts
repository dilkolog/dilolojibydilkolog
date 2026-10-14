import { describe, expect, it } from 'vitest'
import { createEntry } from '../../data/wordInput'
import { aiFillable, cardCompleteness } from '../completeness'

const entry = (extra = {}) => ({ ...createEntry({ word: 'maison', meaning: 'ev', partOfSpeech: 'noun' }, 'fr', new Date()), ...extra })

describe('how full a word card is', () => {
  it('an empty card asks for all four things', () => {
    expect(cardCompleteness(entry())).toEqual({ percent: 0, missing: ['image', 'audio', 'example', 'note'] })
  })

  it('each thing the learner adds is a quarter', () => {
    expect(cardCompleteness(entry({ imageId: 'm1' }))).toEqual({ percent: 25, missing: ['audio', 'example', 'note'] })
    expect(cardCompleteness(entry({ imageId: 'm1', notes: 'bir ev' })).percent).toBe(50)
    expect(cardCompleteness(entry({ imageId: 'm1', notes: 'bir ev', audioId: 'a1', corpus: [{ text: 'La maison.', translation: '', form: 'maison' }] }))).toEqual({ percent: 100, missing: [] })
  })

  it('a native recording from the dictionary counts as sound; a blank note does not count', () => {
    expect(cardCompleteness(entry({ audioUrl: 'https://x/a.mp3' })).missing).not.toContain('audio')
    expect(cardCompleteness(entry({ notes: '   ' })).missing).toContain('note')
  })
})

describe('what the AI fills on a card', () => {
  it('a missing example and memory hook, with partners for a content word that has none', () => {
    expect(aiFillable(entry())).toEqual(['example', 'notes', 'collocations'])
    expect(aiFillable(entry({ notes: 'bir ev' }))).toEqual(['example', 'collocations'])
    expect(aiFillable(entry({ collocations: [{ phrase: 'à la maison', translation: 'evde' }] }))).toEqual(['example', 'notes'])
  })

  it('nothing when the example and the hook are there (partners alone are not worth a call), and no partners for a function word', () => {
    const full = { notes: 'bir ev', corpus: [{ text: 'La maison.', translation: '', form: 'maison' }] }
    expect(aiFillable(entry(full))).toEqual([])
    expect(aiFillable(entry({ partOfSpeech: 'preposition' }))).toEqual(['example', 'notes'])
  })
})
