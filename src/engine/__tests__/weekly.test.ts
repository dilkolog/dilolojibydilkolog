import { describe, expect, it } from 'vitest'
import { weekLine, weekMisses, weekSummary, weekDigest, WEEK_NOTE_MIN_ANSWERS } from '../weekly'
import type { ReviewEvent } from '../types'

const NOW = new Date('2026-10-11T18:00:00')
const day = (d: number, h = 10) => new Date(`2026-10-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00`)

describe('the week in one line', () => {
  it('counts the last seven days of one language: days, answers, right ones, new words, readings', () => {
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
    })
    expect(s).toEqual({ days: 3, answers: 4, right: 0.75, newWords: 1, texts: 1, lastAnswers: 1 })
    expect(weekLine(s)).toBe('3 gün · 4 cevap (%75 doğru) · 1 yeni kelime · 1 metin')
    expect(weekLine(s, 5)).toBe('3 gün · 4 cevap (%75 doğru) · 1 yeni kelime · 1 metin · bu hafta 4 kelime daha')
    expect(weekLine(s, 1)).toBe('3 gün · 4 cevap (%75 doğru) · 1 yeni kelime · 1 metin · haftalık hedefe ulaşıldı')
  })

  it('never counts more than seven days, although 168 hours can touch eight calendar days', () => {
    const events = Array.from({ length: 8 }, (_, i) => ({ timestamp: new Date(2026, 9, 4 + i, 11 - (i === 7 ? 2 : 0)), correct: true, language: 'fr' as const }))
    const s = weekSummary({ language: 'fr', now: new Date(2026, 9, 11, 10), events, vocabulary: [], texts: [] })
    expect(s.days).toBeLessThanOrEqual(7)
  })

  it('says nothing for an empty week', () => {
    expect(weekLine({ days: 0, answers: 0, right: 0, newWords: 0, texts: 0, lastAnswers: 0 })).toBe('')
    // A goal alone does not make a week worth a card, a push or a mail.
    expect(weekLine({ days: 0, answers: 0, right: 0, newWords: 0, texts: 0, lastAnswers: 0 }, 35)).toBe('')
  })

  it('measures the goal by the words met in study, not the words added', () => {
    const now = new Date(2026, 9, 11, 10)
    const events = [{ timestamp: new Date(2026, 9, 10), correct: true, language: 'fr' as const }]
    // 200 words imported this week, 3 of them met in study, plus one met long ago.
    const vocabulary = Array.from({ length: 200 }, () => ({ addedAt: new Date(2026, 9, 9), source: 'manual', language: 'fr' as const }))
    const states = [
      ...Array.from({ length: 3 }, () => ({ language: 'fr' as const, introducedAt: new Date(2026, 9, 10) })),
      { language: 'fr' as const, introducedAt: new Date(2026, 5, 1) },
      { language: 'es' as const, introducedAt: new Date(2026, 9, 10) },
    ]
    const s = weekSummary({ language: 'fr', now, events, vocabulary, texts: [], states })
    expect(s.introduced).toBe(3)
    expect(weekLine(s, 35)).toContain('bu hafta 32 kelime daha')
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


describe('the week\'s misses', () => {
  const miss = (entryId: string, at: Date, over: Partial<ReviewEvent> = {}) => ({ entryId, language: 'fr', verdict: 'wrong', timestamp: at, ...over }) as ReviewEvent
  it('takes the words missed in the last seven days, most missed first, then the latest', () => {
    const events = [
      miss('fr:a', day(9)),
      miss('fr:b', day(8)),
      miss('fr:b', day(10)),
      miss('fr:c', day(10, 12)),
      miss('fr:old', day(2)),
      miss('es:x', day(10), { language: 'es' }),
      { ...miss('fr:d', day(10)), verdict: 'correct' } as ReviewEvent,
    ]
    expect(weekMisses(events, 'fr', NOW)).toEqual(['fr:b', 'fr:c', 'fr:a'])
    expect(weekMisses(events, 'fr', NOW, 2)).toEqual(['fr:b', 'fr:c'])
  })
})

describe('the week for the AI coach', () => {
  const s = { days: 4, answers: 80, right: 0.81, newWords: 6, texts: 1, lastAnswers: 120, missed: [{ entryId: 'e1', wrong: 3 }, { entryId: 'gone', wrong: 2 }], errors: { gender: 5, accent: 2, typo: 1, meaning: 4, form: 1 } }

  it('says the figures, the most common kinds of error and the words missed most, by name', () => {
    const lines = weekDigest(s, (id) => (id === 'e1' ? 'manger' : undefined), (t) => t.toUpperCase())!
    expect(lines[0]).toBe('Days studied: 4/7. Answers: 80 (81% right). Week before: 120 answers.')
    expect(lines).toContain('Mistakes by kind: GENDER ×5, MEANING ×4, ACCENT ×2, TYPO ×1.')
    expect(lines).toContain('Words missed most: manger (3 wrong).')
  })

  it('stays silent for a week too thin to read a pattern in', () => {
    expect(weekDigest({ ...s, answers: WEEK_NOTE_MIN_ANSWERS - 1 }, () => 'x', (t) => t)).toBeUndefined()
  })

  it('counts the kinds of error of the week', () => {
    const now = new Date('2026-10-11T12:00:00')
    const at = (h: number) => new Date(now.getTime() - h * 3_600_000)
    const out = weekSummary({
      language: 'fr',
      now,
      events: [
        { timestamp: at(1), correct: false, language: 'fr', errorType: 'gender' },
        { timestamp: at(2), correct: false, language: 'fr', errorType: 'gender' },
        { timestamp: at(3), correct: true, language: 'fr' },
        { timestamp: at(200), correct: false, language: 'fr', errorType: 'accent' },
      ],
      vocabulary: [],
      texts: [],
    })
    expect(out.errors).toEqual({ gender: 2 })
  })
})
