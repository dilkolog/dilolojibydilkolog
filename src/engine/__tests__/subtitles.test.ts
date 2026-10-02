import { describe, expect, it } from 'vitest'
import { looksLikeSubtitles, parseSubtitles } from '../subtitles'

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
