import { describe, expect, it } from 'vitest'
import { analyzeText, contextEncounters, coverageLine, coverageZone, finishReading, readingKey } from '../reading'
import { newWordState, processAttempt } from '../review'
import { createScheduler } from '../scheduler'
import { decide, decision } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const T = new Date('2026-10-01T10:00:00')
const graduated = (() => {
  let s = newWordState(decision, T)
  for (const m of [0, 15]) s = processAttempt(s, { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 2000, hintsUsed: 0, maxHints: 0, at: new Date(T.getTime() + m * 60_000) }, [], scheduler).state
  return s
})()

describe('analyzeText', () => {
  const text = 'Marie made a brave decision yesterday.\nShe decided to leave the village forever.'

  it('classifies words: stop words and graduated words known, list words learning, names apart', () => {
    const a = analyzeText(text, 'en', [decision, decide], [graduated, newWordState(decide, T)], new Set())
    const status = (w: string) => a.paragraphs.flat().flatMap((s) => s.tokens).find((t) => t.text === w)?.status
    expect(status('decision')).toBe('known')
    expect(status('decided')).toBe('learning')
    expect(status('a')).toBe('known')
    expect(status('brave')).toBe('unseen')
    expect(a.paragraphs).toHaveLength(2)
    // "Marie" starts a sentence, so it can't be told from an ordinary word there.
    expect(status('Marie')).toBe('unseen')
  })

  it('uses the known-word set and computes coverage', () => {
    const known = new Set(['brave', 'yesterday', 'leave', 'village', 'forever', 'marie', 'made'].map((w) => readingKey(w, 'en')))
    const a = analyzeText(text, 'en', [decision, decide], [graduated], known)
    expect(a.counts.unseen).toBe(0)
    expect(a.counts.new).toBe(1)
    expect(a.coverage).toBeCloseTo((a.total - 1) / a.total)
    expect(a.coverageWithList).toBe(1)
  })

  it('finds sentences with exactly one unknown word', () => {
    const known = new Set(['made', 'yesterday', 'marie'].map((w) => readingKey(w, 'en')))
    const a = analyzeText(text, 'en', [decision], [graduated], known)
    expect(a.iPlusOne).toEqual([{ sentence: 'Marie made a brave decision yesterday.', word: 'brave', key: readingKey('brave', 'en') }])
  })

  it('treats a capitalised word never written in lowercase mid-sentence as a name', () => {
    const a = analyzeText('Yesterday we met Pierre at home.', 'en', [], [], new Set())
    expect(a.paragraphs[0][0].tokens.find((t) => t.text === 'Pierre')?.status).toBe('name')
  })
})

describe('finishReading', () => {
  it('turns unmarked unseen words into known ones and counts list words met', () => {
    const a = analyzeText('A brave decision. Another brave decision.', 'en', [decision], [graduated], new Set())
    const r = finishReading(a, new Set([readingKey('another', 'en')]))
    expect(r.knownKeys).toEqual([readingKey('brave', 'en')])
    expect(r.encounters).toEqual({ 'en:decision': 2 })
  })
})

describe('coverageZone', () => {
  it('follows the 98% / 95% thresholds', () => {
    expect(coverageZone(0.99)).toBe('easy')
    expect(coverageZone(0.96)).toBe('ideal')
    expect(coverageZone(0.92)).toBe('hard')
    expect(coverageZone(0.8)).toBe('too_hard')
  })
})

describe('contextEncounters', () => {
  it('counts sentence exercises plus reading meetings', () => {
    const ev = (exerciseType: string) => ({ exerciseType }) as Parameters<typeof contextEncounters>[0][number]
    expect(contextEncounters([ev('mc_context'), ev('mc_meaning'), ev('cloze_typed'), ev('dictation')], 4)).toBe(7)
  })
})

describe('missingFrequent', () => {
  it('lists frequent words not known and not in the list, one per stem, in rank order', async () => {
    const { missingFrequent } = await import('../reading')
    const list = ['the', 'house', 'houses', 'decision', 'brave', 'xyz1', 'garden', 'rare']
    const known = new Set([readingKey('brave', 'en')])
    const out = missingFrequent(list, 'en', [decision], known, 7)
    expect(out.map((m) => [m.word, m.rank])).toEqual([
      ['house', 2],
      ['garden', 7],
    ])
  })
})

describe('what a text would bring new', () => {
  it('counts the different words that are neither known nor in the list', () => {
    const a = analyzeText('The village village forest. The forest was quiet.', 'en', [], [], new Set(['quiet']))
    // village (twice) and forest (twice) are two different new words; "quiet" is known.
    expect(a.unknownWords).toBe(2)
    expect(a.counts.unseen).toBe(4)
  })

  it('writes the line a picker shows', () => {
    expect(coverageLine({ coverage: 0.962, unknownWords: 14 })).toBe('%96,2 biliyorsun (öğrenmeye ideal) · 14 yeni kelime')
    expect(coverageLine({ coverage: 1, unknownWords: 0 })).toBe('%100 biliyorsun (rahat) · yeni kelime yok')
    // The zone follows the rounded figure; words only on the list are not "no new words"; an empty text has no line.
    expect(coverageLine({ coverage: 0.9796, unknownWords: 3 })).toBe('%98 biliyorsun (rahat) · 3 yeni kelime')
    expect(coverageLine({ coverage: 0.8, unknownWords: 0 })).toBe('%80 biliyorsun (çok zor) · kalanlar listende')
    expect(coverageLine({ coverage: 0, unknownWords: 0, total: 0 })).toBe('')
  })
})

describe('rating several texts against one word list', () => {
  const list = [decision]
  const states = [graduated]
  it('gives the same answer as rating each alone, and follows a changed list (a new array)', () => {
    const a = analyzeText('The decision was made.', 'en', list, states, new Set())
    const b = analyzeText('The decision was made.', 'en', list, states, new Set())
    expect(b.counts).toEqual(a.counts)
    // The same arrays are reused; a new list is a new lookup, not the cached one.
    const none = analyzeText('The decision was made.', 'en', [], states, new Set())
    expect(none.counts).not.toEqual(a.counts)
    expect(analyzeText('The decision was made.', 'en', list, states, new Set()).counts).toEqual(a.counts)
  })
})

