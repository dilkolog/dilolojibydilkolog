import { describe, expect, it } from 'vitest'
import { looksLikeSubtitles, parseSubtitles, parseTimedText, youtubeId } from '../subtitles'

describe('parseSubtitles', () => {
  it('cleans an SRT file into reading text', () => {
    const srt = `1
00:00:01,000 --> 00:00:03,000
<i>Bonjour, Marie.</i>

2
00:00:03,500 --> 00:00:05,000
- Tu viens ce soir ?
- Je ne sais pas.

3
00:00:06,000 --> 00:00:07,000
[MUSIQUE]
♪ La la la ♪`
    expect(looksLikeSubtitles(srt)).toBe(true)
    expect(parseSubtitles(srt)).toBe('Bonjour, Marie. Tu viens ce soir ? Je ne sais pas. La la la')
  })

  it('handles WebVTT headers and groups cues into paragraphs', () => {
    const cues = Array.from({ length: 10 }, (_, i) => `00:00:0${i % 10}.000 --> 00:00:0${i % 10}.900\nLínea ${i + 1}.`).join('\n\n')
    const out = parseSubtitles(`WEBVTT\n\nNOTE prueba\n\n${cues}`)
    expect(out.split('\n\n')).toHaveLength(2)
    expect(out.startsWith('Línea 1. Línea 2.')).toBe(true)
    expect(looksLikeSubtitles('Just a normal text.')).toBe(false)
  })
})


describe('YouTube subtitles', () => {
  it('finds the video id in any link form', () => {
    for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'https://youtu.be/dQw4w9WgXcQ', 'https://m.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?feature=x&v=dQw4w9WgXcQ']) {
      expect(youtubeId(u)).toBe('dQw4w9WgXcQ')
    }
    expect(youtubeId('https://example.com/watch?v=1')).toBeNull()
  })

  it('reads timed text, auto captions included, without music marks', () => {
    const xml = '<timedtext format="3"><body><p t="1360" d="1680">[♪♪♪]</p><p t="18640" d="3240">♪ We&#39;re no strangers ♪</p><p t="2" d="1"><s>il</s><s t="200"> fait</s><s> beau</s></p></body></timedtext>'
    expect(parseTimedText(xml)).toBe("We're no strangers il fait beau")
  })
})

describe('a transcript copied from YouTube', async () => {
  const { parseTranscriptPaste } = await import('../subtitles')
  it('reads a timestamp line, then its words, into text and timed cues', () => {
    const got = parseTranscriptPaste('Transkript\n\n0:00\nbonjour bonjour et bienvenue dans ce\n0:03\ncours de français pour débutant\n0:07\nalors aujourd’hui\n1:02:05\non commence\n')
    expect(got?.cues).toEqual([
      { start: 0, text: 'bonjour bonjour et bienvenue dans ce' },
      { start: 3, text: 'cours de français pour débutant' },
      { start: 7, text: 'alors aujourd’hui' },
      { start: 3725, text: 'on commence' },
    ])
    expect(got?.text).toBe('bonjour bonjour et bienvenue dans ce cours de français pour débutant alors aujourd’hui on commence')
  })
  it('reads the stamp and the words on one line too, and drops sound notes', () => {
    expect(parseTranscriptPaste('0:01 Salut !\n0:04 [Musique]\n0:06 Ça va ?\n0:09 Très bien.')?.cues).toEqual([
      { start: 1, text: 'Salut !' },
      { start: 6, text: 'Ça va ?' },
      { start: 9, text: 'Très bien.' },
    ])
  })
  it('leaves prose alone, even with a time or two in it', () => {
    expect(parseTranscriptPaste('Le train part à 10:30.\nNous arrivons à 12:45.\nBon voyage.')).toBeNull()
    expect(parseTranscriptPaste('0:05\na\n0:02\nb\n0:09\nc')).toBeNull()
  })
})
