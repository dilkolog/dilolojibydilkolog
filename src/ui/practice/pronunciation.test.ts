import { describe, expect, it } from 'vitest'
import { explainAzureError, parseAssessment, tipWords, wav } from './pronunciation'

describe('pronunciation assessment (Azure)', () => {
  it('reads the scores of the whole utterance and of each word', () => {
    const r = parseAssessment({
      RecognitionStatus: 'Success',
      DisplayText: 'La maison.',
      NBest: [
        {
          Display: 'La maison.',
          AccuracyScore: 82.4,
          FluencyScore: 90,
          CompletenessScore: 100,
          PronScore: 86.1,
          Words: [
            { Word: 'la', AccuracyScore: 95, ErrorType: 'None' },
            { Word: 'maison', AccuracyScore: 58, ErrorType: 'Mispronunciation' },
          ],
        },
      ],
    })
    expect(r).toMatchObject({ score: 86, accuracy: 82, fluency: 90, completeness: 100, heard: 'La maison.' })
    expect(r.prosody).toBeUndefined()
    expect(r.words).toEqual([
      { word: 'la', accuracy: 95, error: 'None' },
      { word: 'maison', accuracy: 58, error: 'Mispronunciation' },
    ])
  })

  it('says why nothing could be scored', () => {
    expect(() => parseAssessment({ RecognitionStatus: 'InitialSilenceTimeout' })).toThrow(/Ses duyulmadı/)
    expect(() => parseAssessment({ RecognitionStatus: 'NoMatch' })).toThrow(/anlaşılamadı/)
    expect(explainAzureError(401, '')).toMatch(/KEY 1/)
  })

  it('writes 16 kHz mono PCM WAV', async () => {
    const blob = wav(new Float32Array([0, 1, -1]), 16000)
    const v = new DataView(await blob.arrayBuffer())
    expect(blob.size).toBe(44 + 6)
    expect(v.getUint32(24, true)).toBe(16000)
    expect(v.getInt16(46, true)).toBe(0x7fff)
    expect(v.getInt16(48, true)).toBe(-0x8000)
  })
})

describe('the words worth a pronunciation tip', () => {
  it('takes the words left out first, then the lowest scores under 80, each once, at most four; never the extra ones said', () => {
    const r = {
      score: 60,
      accuracy: 60,
      fluency: 70,
      completeness: 80,
      heard: '',
      words: [
        { word: 'Le', accuracy: 95, error: 'None' },
        { word: 'chien', accuracy: 52, error: 'Mispronunciation' },
        { word: 'euh', accuracy: 0, error: 'Insertion' },
        { word: 'mange', accuracy: 0, error: 'Omission' },
        { word: 'Chien', accuracy: 70, error: 'None' },
        { word: 'rue', accuracy: 64, error: 'Mispronunciation' },
        { word: 'heureux', accuracy: 41, error: 'Mispronunciation' },
        { word: 'grenouille', accuracy: 75, error: 'None' },
      ],
    }
    expect(tipWords(r)).toEqual([
      { word: 'mange', accuracy: 0, omitted: true },
      { word: 'heureux', accuracy: 41 },
      { word: 'chien', accuracy: 52 },
      { word: 'rue', accuracy: 64 },
    ])
    expect(tipWords({ ...r, words: [{ word: 'bien', accuracy: 92, error: 'None' }] })).toEqual([])
  })
})
