import { describe, expect, it } from 'vitest'
import { blindSpots, type BlindSpotInput } from '../blindSpots'
import type { GrammarExercise, GrammarLog } from '../grammar'
import { MINIMAL_PAIRS, pairKey } from '../listening'
import type { TrapWord } from '../traps'
import type { WritingRow } from '../writingErrors'

const NOW = '2026-10-10T10:00:00Z'
const rec = (ok: number, wrong: number) => ({ ok, wrong, last: NOW })
const ex = (id: string, topic: string): GrammarExercise => ({ id, language: 'fr', level: 'B2', topic, type: 'cloze', prompt: 'a ___', answer: 'b', explanation: 'x'.repeat(30), source: 't' })
const trap = (lemma: string): TrapWord => ({ id: `fr-${lemma}`, language: 'fr', lemma, looks: 'x', trap: 'y', meaning: 'z', text: 't', tr: 't', source: 't' })

const base = (over: Partial<BlindSpotInput> = {}): BlindSpotInput => ({
  language: 'fr',
  errors: {},
  grammar: {},
  grammarExercises: [],
  pairs: {},
  traps: {},
  trapWords: [],
  reflex: {},
  earMissed: 0,
  ...over,
})

describe('blindSpots', () => {
  it('says nothing without data, or with too little', () => {
    expect(blindSpots(base())).toEqual([])
    expect(blindSpots(base({ errors: { gender: 3 } }))).toEqual([])
    expect(blindSpots(base({ grammar: { a: rec(1, 2) }, grammarExercises: [ex('a', 'subjonctif')] }))).toEqual([])
  })

  it('names the kind of mistake behind most wrong answers, only where the practice exists for the language', () => {
    const spots = blindSpots(base({ errors: { gender: 12, typo: 8 } }))
    expect(spots[0]).toMatchObject({ id: 'error:gender', target: 'gender' })
    expect(spots[0].detail).toContain('%60')
    expect(blindSpots(base({ language: 'en', errors: { gender: 12, typo: 8 } }))).toEqual([])
    // A kind that is a small share of many mistakes is not a blind spot.
    expect(blindSpots(base({ errors: { accent: 6, typo: 30, meaning: 30 } }))).toEqual([])
  })

  it('finds the weakest tense, grammar topic and sound contrast, each with its practice', () => {
    const grammar: GrammarLog = { a: rec(2, 8), b: rec(9, 1) }
    const pair = MINIMAL_PAIRS.fr[0]
    const spots = blindSpots(
      base({
        lab: { favorites: [], recent: [], records: {}, tally: { 'passe-compose|0': { ok: 2, wrong: 4 }, 'passe-compose|3': { ok: 1, wrong: 2 }, 'present|0': { ok: 20, wrong: 1 } } },
        grammar,
        grammarExercises: [ex('a', 'subjonctif'), ex('b', 'participe_passe')],
        pairs: { [pairKey('fr', pair)]: rec(1, 5) },
      }),
    )
    const byId = Object.fromEntries(spots.map((s) => [s.id.split(':')[0], s]))
    expect(byId.tense).toMatchObject({ target: 'verbs' })
    expect(byId.tense.title).toContain('passé composé')
    expect(byId.grammar).toMatchObject({ target: 'grammar' })
    expect(byId.grammar.title).toContain('Subjonctif')
    expect(byId.pair.title).toContain(pair.contrast)
  })

  it('counts false friends, slow phrases and missed words only in numbers that mean something', () => {
    const spots = blindSpots(
      base({
        traps: { 'fr-a': rec(0, 2), 'fr-b': rec(1, 2), 'fr-other': rec(0, 5) },
        trapWords: [trap('a'), trap('b')],
        reflex: { p1: rec(0, 1), p2: rec(0, 2), p3: rec(1, 2), p4: rec(5, 0) },
        earMissed: 7,
      }),
    )
    expect(spots.map((s) => s.target).sort()).toEqual(['ear', 'reflex', 'traps'])
    expect(blindSpots(base({ reflex: { p1: rec(0, 1), p2: rec(0, 2) }, earMissed: 4 }))).toEqual([])
  })

  it('notices the wrong register when enough answers say so', () => {
    const spots = blindSpots(base({ register: { 'a|informal': rec(1, 2), 'b|formal': rec(0, 3), 'c|standard': rec(2, 0) } }))
    expect(spots).toHaveLength(1)
    expect(spots[0]).toMatchObject({ id: 'register', target: 'register', action: 'Kayıt farkı' })
    expect(blindSpots(base({ register: { 'a|informal': rec(4, 1), 'b|formal': rec(3, 0) } }))).toEqual([])
    expect(blindSpots(base({ register: { 'a|informal': rec(0, 3) } }))).toEqual([])
  })

  it('shows at most three, the strongest first', () => {
    const spots = blindSpots(
      base({
        errors: { gender: 20, accent: 10 },
        grammar: { a: rec(0, 10) },
        grammarExercises: [ex('a', 'subjonctif')],
        earMissed: 12,
        reflex: { a: rec(0, 1), b: rec(0, 1), c: rec(0, 1) },
      }),
    )
    expect(spots).toHaveLength(3)
    expect(spots[0].score).toBeGreaterThanOrEqual(spots[1].score)
    expect(spots[1].score).toBeGreaterThanOrEqual(spots[2].score)
  })
})

describe('blindSpots: the learner\'s own writing', () => {
  const row = (kind: WritingRow['kind'], n: number, wrong = 'la problème', fix = 'le problème'): WritingRow => ({ kind, n, last: '2026-10-10', samples: [{ wrong, fix }], seen: [] })

  it('names the kind of mistake that keeps coming back, with an example and the practice for it', () => {
    const [spot] = blindSpots(base({ writing: [row('agreement', 9), row('verb', 3)] }))
    expect(spot).toMatchObject({ id: 'writing:agreement', target: 'grammar', lesson: { topic: 'basics_fr_adjectifs' } })
    expect(spot.title).toContain('Uyum')
    expect(spot.detail).toContain('9 kez')
    expect(spot.detail).toContain('“la problème” → “le problème”')
  })

  it('says nothing for a few findings, or when no kind stands out', () => {
    expect(blindSpots(base({ writing: [row('agreement', 3)] }))).toEqual([])
    expect(blindSpots(base({ writing: [row('agreement', 4), row('verb', 4), row('preposition', 4), row('article', 4), row('confusion', 4)] }))).toEqual([])
  })

  it('does not count punctuation, and skips a kind with no practice (spelling)', () => {
    expect(blindSpots(base({ writing: [row('punctuation', 30), row('agreement', 4)] }))[0]?.id).toBe('writing:agreement')
    expect(blindSpots(base({ writing: [row('spelling', 20)] }))).toEqual([])
  })
})
