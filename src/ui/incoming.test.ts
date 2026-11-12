// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { readIncoming, readShared, webLink } from './incoming'

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

describe('source links', () => {
  it('only a web address is kept as a word’s source', () => {
    expect(webLink('https://ex.fr/a?b=1')).toBe('https://ex.fr/a?b=1')
    expect(webLink('http://ex.fr')).toBe('http://ex.fr')
    expect(webLink('javascript://ex.fr/%0Aalert(1)')).toBeUndefined()
    expect(webLink('JavaScript:alert(1)')).toBeUndefined()
    expect(webLink('data:text/html,<b>x</b>')).toBeUndefined()
    expect(webLink('not a url')).toBeUndefined()
    expect(webLink(null)).toBeUndefined()
  })

  it('a bookmarklet word with a javascript: source comes without it', () => {
    history.replaceState(null, '', '/?add=chat&src=' + encodeURIComponent('javascript://ex.fr/%0Aalert(1)'))
    expect(readIncoming()).toMatchObject({ word: 'chat', src: undefined })
    history.replaceState(null, '', '/?add=chat&src=' + encodeURIComponent('https://ex.fr/a'))
    expect(readIncoming()?.src).toBe('https://ex.fr/a')
    history.replaceState(null, '', '/')
  })

  it('a shared javascript: link is neither a source nor something to read', () => {
    expect(readShared(q({ share_text: 'dépaysement', share_url: 'javascript:alert(1)' }))).toEqual({ word: 'dépaysement', context: '', src: undefined })
    expect(readShared(q({ share_url: 'javascript:alert(1)' }))).toBeNull()
  })
})
