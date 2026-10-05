import { describe, expect, it } from 'vitest'
import { explainAzureError, parseAssessment, wav } from './pronunciation'

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
