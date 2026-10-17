import { describe, expect, it } from 'vitest'
import { DUEL_ROUNDS, decodeDuel, duelOptions, duelPool, duelQuestions, duelWinner, encodeDuel, pickDuelIds, type DuelChallenge } from '../duel'
import type { GrammarExercise } from '../grammar'
import { createRng } from '../rng'

const ex = (n: number, topic: string, type: GrammarExercise['type'] = 'choice'): GrammarExercise => ({
  id: `fr-${topic}-${String(n).padStart(2, '0')}`,
  language: 'fr',
  level: 'B1',
  topic,
  type,
  prompt: `Phrase ${n} ___`,
  answer: 'a',
  options: ['a', 'b', 'c', 'd'],
  explanation: 'x',
  source: 'test',
})
const pool = [...Array.from({ length: 8 }, (_, i) => ex(i, 'futur')), ...Array.from({ length: 8 }, (_, i) => ex(i, 'passe')), ...Array.from({ length: 6 }, (_, i) => ex(i, 'subj')), ex(1, 'x', 'cloze')]

describe('pickDuelIds', () => {
  it('takes ten different choice questions, one per topic first', () => {
    const ids = pickDuelIds(pool, createRng(1))
    expect(ids).toHaveLength(DUEL_ROUNDS)
    expect(new Set(ids).size).toBe(DUEL_ROUNDS)
    expect(ids.every((id) => !id.includes('-x-'))).toBe(true)
    expect(new Set(ids.slice(0, 3).map((id) => id.split('-')[1]))).toEqual(new Set(['futur', 'passe', 'subj']))
  })
  it('is the same for the same seed', () => {
    expect(pickDuelIds(pool, createRng(7))).toEqual(pickDuelIds(pool, createRng(7)))
  })
})

describe('duelOptions', () => {
  it('shuffles the same way every time for a question, and keeps all the options', () => {
    const q = ex(3, 'futur')
    expect(duelOptions(q)).toEqual(duelOptions({ ...q }))
    expect([...duelOptions(q)].sort()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('duelWinner', () => {
  const r = (score: number, ms: number) => ({ name: 'x', score, ms })
  it('goes to the higher score, then to the faster', () => {
    expect(duelWinner(r(8, 50_000), r(7, 10_000))).toBe('from')
    expect(duelWinner(r(6, 50_000), r(7, 90_000))).toBe('reply')
    expect(duelWinner(r(7, 40_000), r(7, 30_000))).toBe('reply')
    expect(duelWinner(r(7, 30_000), r(7, 30_000))).toBe('tie')
  })
})

describe('encode and decode', () => {
  const c: DuelChallenge = { language: 'fr', ids: ['fr-futur-01', 'fr-passe-02'], from: { name: 'Ali Çelik', score: 8, ms: 41_250 } }
  it('round-trips a challenge, with accents in the name, and a reply', () => {
    expect(decodeDuel(encodeDuel(c))).toEqual(c)
    const withReply = { ...c, reply: { name: 'Şule', score: 7, ms: 52_000 } }
    expect(decodeDuel(encodeDuel(withReply))).toEqual(withReply)
  })
  it('reads a whole link too', () => {
    expect(decodeDuel(`https://nigalingo.online/?duel=${encodeDuel(c)}`)).toEqual(c)
    expect(decodeDuel(`  ${encodeDuel(c)}  `)).toEqual(c)
  })
  it('refuses what is not a duel, an unknown language, odd ids and an unnamed player', () => {
    expect(decodeDuel('')).toBeNull()
    expect(decodeDuel('not a code')).toBeNull()
    expect(decodeDuel(encodeDuel({ ...c, language: 'de' as never }))).toBeNull()
    expect(decodeDuel(encodeDuel({ ...c, ids: ['../etc/passwd', '<b>'] }))).toBeNull()
    expect(decodeDuel(encodeDuel({ ...c, from: { ...c.from, name: '' } }))).toBeNull()
  })
  it('keeps the numbers within limits', () => {
    const big = decodeDuel(encodeDuel({ ...c, from: { name: 'x', score: 9999, ms: 9e12 } }))!
    expect(big.from.score).toBe(50)
    expect(big.from.ms).toBe(3_600_000)
  })
})

describe('duelQuestions', () => {
  it('finds the questions in order and skips one that is gone', () => {
    const c: DuelChallenge = { language: 'fr', ids: ['fr-passe-02', 'fr-gone-01', 'fr-futur-01'], from: { name: 'x', score: 1, ms: 1 } }
    expect(duelQuestions(c, pool).map((q) => q.id)).toEqual(['fr-passe-02', 'fr-futur-01'])
  })
})

describe('narrowing a duel', () => {
  it('takes questions of one topic, or one level, only', () => {
    const mixed = [...pool.map((q, i) => ({ ...q, level: i % 2 ? ('B2' as const) : ('B1' as const) }))]
    const ids = pickDuelIds(mixed, createRng(1), 5, { topic: 'futur' })
    expect(ids).toHaveLength(5)
    expect(ids.every((id) => id.startsWith('fr-futur-'))).toBe(true)
    const b2 = pickDuelIds(mixed, createRng(1), 10, { level: 'B2' })
    const byId = new Map(mixed.map((q) => [q.id, q]))
    expect(b2.length).toBeGreaterThan(0)
    expect(b2.every((id) => byId.get(id)!.level === 'B2')).toBe(true)
    expect(duelPool(mixed, { topic: 'nothing' })).toEqual([])
  })
})
