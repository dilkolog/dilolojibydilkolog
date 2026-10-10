import { describe, expect, it } from 'vitest'
import { sentenceAt, sentenceTimes, withAnchors } from '../listenFollow'
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
    const t = sentenceTimes(['aaaa', 'bbbb'], undefined, 100)!
    // The reader's lead-in comes first, then the sentences in proportion.
    expect(t[0]).toBeGreaterThan(0)
    expect(t[1]).toBeGreaterThan(t[0])
    expect(t[1]).toBeLessThan(100)
  })

  it('pauses count: after a sentence, at commas and between paragraphs, so later sentences start later than by letters alone', () => {
    const plain = sentenceTimes(['aaaa bbbb', 'cccc dddd', 'eeee ffff'], undefined, 60)!
    const paused = sentenceTimes(['aaaa bbbb.', 'cccc, dddd.', 'eeee ffff.'], undefined, 60, { paragraphStarts: [true, false, true] })!
    // A gap before the third sentence (a new paragraph) pushes it out relative to the letters.
    expect(paused[2] - paused[1]).toBeGreaterThan(plain[2] - plain[1])
    expect(paused.every((x, i) => i === 0 || x > paused[i - 1])).toBe(true)
  })

  it('a pin moves the estimate so the sentence starts when it was heard; in between the shift slides', () => {
    const base = [0, 10, 20, 30, 40]
    // Sentence 1 was heard 4 s later than the estimate.
    expect(withAnchors(base, [{ sentence: 1, time: 14 }])).toEqual([4, 14, 24, 34, 44])
    // Two pins: sentence 1 four seconds late, sentence 3 four early: the shift fades between them.
    expect(withAnchors(base, [{ sentence: 1, time: 14 }, { sentence: 3, time: 26 }])).toEqual([4, 14, 20, 26, 36])
    // Nothing goes backwards or before 0.
    expect(withAnchors([0, 5, 10], [{ sentence: 2, time: 1 }])).toEqual([0, 0, 1])
  })

  it('pins apply to timed cues too, and without pins nothing changes', () => {
    const sentences = ['Hola a todos.', 'Hoy hablamos del tiempo.', 'Hace mucho calor.', 'Hasta pronto.']
    const cues = parseTimedCues(srt)
    const exact = sentenceTimes(sentences, cues, undefined)!
    expect(sentenceTimes(sentences, cues, undefined, { anchors: [] })).toEqual(exact)
    expect(sentenceTimes(sentences, cues, undefined, { anchors: [{ sentence: 0, time: 3 }] })![0]).toBe(3)
  })

  it('the sentence heard is the last one started', () => {
    expect(sentenceAt([0, 10, 20], 15)).toBe(1)
    expect(sentenceAt([0, 10, 20], 9.9)).toBe(1)
    expect(sentenceAt([5, 10], 1)).toBe(-1)
  })

  it('handles edge cases: empty list, single sentence, and unknown or zero duration', () => {
    expect(sentenceTimes([], undefined, 60)).toEqual([])
    expect(sentenceTimes([], undefined, undefined)).toBeNull()

    const single = sentenceTimes(['Bonjour le monde.'], undefined, 10)!
    expect(single).toHaveLength(1)
    expect(single[0]).toBeGreaterThan(0)
    expect(single[0]).toBeLessThan(10)

    expect(sentenceTimes(['Sentence 1', 'Sentence 2'], undefined, undefined)).toBeNull()

    // Duration 0 (like undefined) means length is not known yet; returns null
    expect(sentenceTimes(['Single sentence'], undefined, 0)).toBeNull()

    const punctuationOnly = sentenceTimes(['...', '!!!'], undefined, 10)!
    expect(punctuationOnly).toHaveLength(2)
  })

  it('handles anchor edge cases: out of bounds indices and negative target times', () => {
    const base = [0, 10, 20]
    expect(withAnchors(base, [{ sentence: -1, time: 5 }, { sentence: 99, time: 50 }])).toEqual([0, 10, 20])
    // Shift -10 pulls [-10, 0, 10], clamped at zero produces [0, 0, 10]
    expect(withAnchors(base, [{ sentence: 0, time: -10 }])).toEqual([0, 0, 10])
  })

  it('handles cues when cue text does not match text sentences (fallback to offsets)', () => {
    const cues = parseTimedCues('1\n00:00:02,000 --> 00:00:06,000\nCompletely different audio words.')
    const sentences = ['Bonjour ici.', 'Comment ça va?']
    const times = sentenceTimes(sentences, cues, undefined)!
    expect(times).toHaveLength(2)
    expect(times[0]).toBeGreaterThanOrEqual(0)
    expect(times[1]).toBeGreaterThanOrEqual(times[0])
  })
})
