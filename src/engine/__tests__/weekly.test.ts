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
    expect(s).toEqual({ days: 3, answers: 4, right: 0.75, newWords: 1, texts: 1, topVerb: { verb: 'être', count: 3 }, lastAnswers: 1 })
    expect(weekLine(s)).toBe('3 gün · 4 cevap (%75 doğru) · 1 yeni kelime · 1 metin · en çok gördüğün fiil: être')
  })

  it('says nothing for an empty week', () => {
    expect(weekLine({ days: 0, answers: 0, right: 0, newWords: 0, texts: 0, lastAnswers: 0 })).toBe('')
  })
})

describe('the words missed in the week', () => {
  const base = { language: 'fr' as const, now: NOW, vocabulary: [], texts: [] }
  const miss = (entryId: string, d: number, extra = {}) => ({ timestamp: day(d), correct: false, language: 'fr' as const, entryId, ...extra })

  it('lists words answered wrong twice or more, the most missed first, three at most', () => {
    const s = weekSummary({
      ...base,
      events: [
        miss('a', 8), miss('a', 9), miss('a', 10),
        miss('b', 8), miss('b', 9),
        miss('c', 9), // once is a slip
        miss('d', 7), miss('d', 8),
        miss('e', 7), miss('e', 8),
        miss('f', 1), miss('f', 2), // older than the week
        miss('g', 9, { mode: 'game' }), miss('g', 10, { mode: 'game' }),
      ],
    })
    expect(s.missed).toEqual([
      { entryId: 'a', wrong: 3 },
      { entryId: 'b', wrong: 2 },
      { entryId: 'd', wrong: 2 },
    ])
  })

  it('has no list when nothing was missed twice', () => {
    expect(weekSummary({ ...base, events: [miss('a', 8)] }).missed).toBeUndefined()
  })
})

