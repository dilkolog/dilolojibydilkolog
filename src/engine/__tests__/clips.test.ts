import { describe, expect, it } from 'vitest'
import { embedUrl, findClips, parseTimedCues, splitAround } from '../clips'

const XML = `<?xml version="1.0" encoding="utf-8" ?><timedtext format="3"><body>
<p t="1000" d="2500">Il faut <s>décider</s> maintenant.</p>
<p t="3500" d="2000">[Musique]</p>
<p t="5500" d="3000">Elle a décidé de partir&#39;.</p>
<p t="8500" d="2000">Tout à fait d&amp;accord.</p>
<p t="10500">Une dernière ligne.</p>
</body></timedtext>`

describe('captions with their times', () => {
  it('reads each line with its start and end in seconds, without markup, entities or sound notes', () => {
    const cues = parseTimedCues(XML)
    expect(cues.map((c) => c.text)).toEqual(['Il faut décider maintenant.', "Elle a décidé de partir'.", "Tout à fait d&accord.", 'Une dernière ligne.'])
    expect(cues[0]).toMatchObject({ start: 1, end: 3.5 })
    // A line with no duration is given two seconds.
    expect(cues[3]).toMatchObject({ start: 10.5, end: 12.5 })
  })
})

describe('where a word is spoken', () => {
  const cues = parseTimedCues(XML)
  const video = { id: 'abc12345678', title: 'Un jour', channel: 'Chaîne' }

  it('finds the lines with the word in any form, with the line before and after', () => {
    const clips = findClips(cues, 'décider', 'fr', video)
    expect(clips.map((c) => [c.form, c.start])).toEqual([['décider', 1], ['décidé', 5.5]])
    expect(clips[1].before).toBe('Il faut décider maintenant.')
    expect(clips[0].after).toBe("Elle a décidé de partir'.")
    expect(clips[1]).toMatchObject({ id: 'abc12345678', title: 'Un jour', channel: 'Chaîne' })
  })

  it('stops at the most asked for, and finds nothing for a word that is not there', () => {
    expect(findClips(cues, 'décider', 'fr', video, 1)).toHaveLength(1)
    expect(findClips(cues, 'maison', 'fr', video)).toEqual([])
  })

  it('leaves out very long lines', () => {
    const long = [{ start: 0, end: 2, text: `décider ${'mot '.repeat(60)}` }]
    expect(findClips(long, 'décider', 'fr', video)).toEqual([])
  })
})

describe('playing a clip', () => {
  it('starts a second early and ends a second late, with captions on in the language', () => {
    const url = embedUrl({ id: 'abc12345678', start: 5.5, end: 8.5 }, 'fr')
    expect(url).toContain('youtube-nocookie.com/embed/abc12345678')
    expect(url).toContain('start=4')
    expect(url).toContain('end=10')
    expect(url).toContain('cc_lang_pref=fr')
    expect(embedUrl({ id: 'abc12345678', start: 0.4, end: 2 }, 'es')).toContain('start=0')
  })

  it('splits a line around the form found', () => {
    expect(splitAround('Elle a décidé de partir', 'décidé')).toEqual(['Elle a ', 'décidé', ' de partir'])
    expect(splitAround('Elle part', 'décidé')).toEqual(['Elle part', '', ''])
  })
})
