import { describe, expect, it } from 'vitest'
import { weekLine, weekSummary } from '../weekly'

const NOW = new Date('2026-10-11T18:00:00')
const day = (d: number, h = 10) => new Date(`2026-10-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00`)

describe('the week in one line', () => {
  it('counts the last seven days of one language: days, answers, right ones, new words, readings, the verb met most', () => {
    const s = weekSummary({
      language: 'fr',
      now: NOW,
      events: [
        { timestamp: day(5), correct: true, language: 'fr' },
        { timestamp: day(5, 20), correct: false, language: 'fr' },
        { timestamp: day(8), correct: true, language: 'fr' },
        { timestamp: day(11), correct: true, language: 'fr' },
        // Too old, another language.
        { timestamp: day(1), correct: true, language: 'fr' },
        { timestamp: day(9), correct: false, language: 'es' },
      ],
      vocabulary: [
        { addedAt: day(6), source: 'user', language: 'fr' },
        { addedAt: day(7), source: 'sample', language: 'fr' },
        { addedAt: day(2), source: 'user', language: 'fr' },
      ],
      texts: [{ history: [{ at: day(9).toISOString() }] }, { history: [{ at: day(1).toISOString() }] }],
      seen: {
        être: [{ form: 'était', tense: 'imparfait', count: 3, at: day(9).toISOString() }],
        avoir: [{ form: 'avait', tense: 'imparfait', count: 9, at: day(1).toISOString() }],
      },
    })
    expect(s).toEqual({ days: 3, answers: 4, right: 0.75, newWords: 1, texts: 1, topVerb: { verb: 'être', count: 3 } })
    expect(weekLine(s)).toBe('3 gün · 4 cevap (%75 doğru) · 1 yeni kelime · 1 metin · en çok gördüğün fiil: être')
  })

  it('says nothing for an empty week', () => {
    expect(weekLine({ days: 0, answers: 0, right: 0, newWords: 0, texts: 0 })).toBe('')
  })
})
