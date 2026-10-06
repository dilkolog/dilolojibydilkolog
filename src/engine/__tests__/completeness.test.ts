import { describe, expect, it } from 'vitest'
import { createEntry } from '../../data/wordInput'
import { cardCompleteness } from '../completeness'

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
