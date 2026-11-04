import { describe, expect, it } from 'vitest'
import { readShared } from './incoming'

const q = (o: Record<string, string>) => new URLSearchParams(o)

describe('shared text from other apps', () => {
  it('takes a short selection as the word and keeps the link', () => {
    expect(readShared(q({ share_text: '“dépaysement”', share_url: 'https://lemonde.fr/a' }))).toEqual({ word: 'dépaysement', context: '', src: 'https://lemonde.fr/a' })
  })
  it('takes a sentence as context, with the link pulled out of the text', () => {
    const r = readShared(q({ share_text: 'Il a décidé de tout quitter pour vivre à la campagne. https://ex.fr/x' }))
    expect(r).toEqual({ word: '', context: 'Il a décidé de tout quitter pour vivre à la campagne.', src: 'https://ex.fr/x' })
  })
  it('ignores empty shares', () => {
    expect(readShared(q({}))).toBeNull()
    expect(readShared(q({ share_url: 'http://ex.fr' }))).toBeNull()
  })
})

describe('Share → Diloloji: an article or a video goes to Reading', () => {
  const article = Array.from({ length: 40 }, (_, i) => `mot${i}`).join(' ')
  it('a long selection is a text to read, with its title and link', () => {
    const r = readShared(q({ share_text: `${article} https://lemonde.fr/a`, share_title: 'Un titre', share_url: 'https://lemonde.fr/a' }))
    expect(r?.read).toEqual({ text: article, title: 'Un titre', url: 'https://lemonde.fr/a' })
    expect(r?.word).toBe('')
  })
  it('a sentence is still an example sentence, not a text', () => {
    expect(readShared(q({ share_text: 'Il a décidé de tout quitter pour vivre à la campagne.' }))?.read).toBeUndefined()
  })
  it('a YouTube link alone is a video to fetch subtitles for', () => {
    expect(readShared(q({ share_text: 'https://youtu.be/abc123', share_title: 'Vidéo' }))?.read).toEqual({ url: 'https://youtu.be/abc123', title: 'Vidéo' })
    expect(readShared(q({ share_url: 'https://www.youtube.com/watch?v=abc123' }))?.read).toEqual({ url: 'https://www.youtube.com/watch?v=abc123', title: undefined })
  })
  it('a video shared with its name beside the link is read, not learnt as a word', () => {
    expect(readShared(q({ share_text: 'Apprendre le français https://youtu.be/abcdefghijk' }))).toEqual({ word: '', context: '', src: 'https://youtu.be/abcdefghijk', read: { url: 'https://youtu.be/abcdefghijk', title: 'Apprendre le français' } })
    expect(readShared(q({ share_title: 'Une vidéo', share_url: 'https://www.youtube.com/watch?v=abcdefghijk' }))?.read).toEqual({ url: 'https://www.youtube.com/watch?v=abcdefghijk', title: 'Une vidéo' })
  })

  it('a web page’s link alone is read too', () => {
    expect(readShared(q({ share_url: 'https://www.lemonde.fr/article' }))?.read).toEqual({ url: 'https://www.lemonde.fr/article', title: undefined })
  })
})
