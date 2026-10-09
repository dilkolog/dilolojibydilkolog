import { describe, expect, it } from 'vitest'
import { sentenceAt, sentenceTimes } from '../listenFollow'
import { parseTimedCues } from '../subtitles'

const srt = `1
00:00:01,000 --> 00:00:04,000
Hola a todos.

2
00:00:04,500 --> 00:00:09,000
Hoy hablamos del tiempo. Hace mucho calor.

3
00:01:10,250 --> 00:01:15,000
<i>Hasta pronto.</i>`

describe('following the audio sentence by sentence', () => {
  it('reads timed cues from SRT and WebVTT', () => {
    expect(parseTimedCues(srt)).toEqual([
      { start: 1, text: 'Hola a todos.' },
      { start: 4.5, text: 'Hoy hablamos del tiempo. Hace mucho calor.' },
      { start: 70.25, text: 'Hasta pronto.' },
    ])
    expect(parseTimedCues('WEBVTT\n\n01:02.500 --> 01:04.000\nBonjour.')).toEqual([{ start: 62.5, text: 'Bonjour.' }])
  })

  it('lays the sentences over the cues: exact starts, within a cue by position', () => {
    const sentences = ['Hola a todos.', 'Hoy hablamos del tiempo.', 'Hace mucho calor.', 'Hasta pronto.']
    const t = sentenceTimes(sentences, parseTimedCues(srt), undefined)!
    expect(t[0]).toBe(1)
    expect(t[1]).toBe(4.5)
    // The second sentence of a cue starts part way through it.
    expect(t[2]).toBeGreaterThan(4.5)
    expect(t[2]).toBeLessThan(70.25)
    expect(t[3]).toBe(70.25)
  })

  it('without cues, by position in the text and the audio length; nothing until the length is known', () => {
    expect(sentenceTimes(['aaaa', 'bbbb'], undefined, undefined)).toBeNull()
    expect(sentenceTimes(['aaaa', 'bbbb'], undefined, 100)).toEqual([0, 50])
  })

  it('the sentence heard is the last one started', () => {
    expect(sentenceAt([0, 10, 20], 15)).toBe(1)
    expect(sentenceAt([0, 10, 20], 9.9)).toBe(1)
    expect(sentenceAt([5, 10], 1)).toBe(-1)
  })
})
