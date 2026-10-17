import { describe, expect, it } from 'vitest'
import type { DuelChallenge } from '../duel'
import { addRecord, byOpponent, cleanRecords, recordOf, tally } from '../duelHistory'

const c: DuelChallenge = { language: 'fr', ids: ['fr-a-01', 'fr-a-02'], from: { name: 'Şule', score: 8, ms: 40_000 } }
const at = new Date('2026-10-18T10:00:00Z')

describe('recordOf', () => {
  it('says win, loss or tie for the first player given', () => {
    const me = (score: number, ms = 50_000) => ({ name: 'Ben', score, ms })
    expect(recordOf(c, me(9), c.from, at)).toMatchObject({ outcome: 'win', opponent: 'Şule', mine: 9, theirs: 8 })
    expect(recordOf(c, me(7), c.from, at).outcome).toBe('loss')
    expect(recordOf(c, me(8, 40_000), c.from, at).outcome).toBe('tie')
  })
})

describe('the list', () => {
  const rec = (key: string, opponent: string, outcome: 'win' | 'loss' | 'tie') => ({ key, opponent, mine: 5, theirs: 5, outcome, at: at.toISOString() })
  it('keeps the same duel once, newest first, thirty at most', () => {
    let list = [rec('a', 'Ali', 'win')]
    list = addRecord(list, rec('b', 'Veli', 'loss'))
    list = addRecord(list, rec('a', 'Ali', 'win'))
    expect(list.map((r) => r.key)).toEqual(['a', 'b'])
    for (let i = 0; i < 40; i++) list = addRecord(list, rec(`k${i}`, 'X', 'tie'))
    expect(list).toHaveLength(30)
  })
  it('tallies, per person too', () => {
    const list = [rec('1', 'Ali', 'win'), rec('2', 'Ali', 'win'), rec('3', 'Ali', 'loss'), rec('4', 'Veli', 'tie')]
    expect(tally(list)).toEqual({ wins: 2, losses: 1, ties: 1 })
    expect(byOpponent(list)).toEqual([
      { opponent: 'Ali', tally: { wins: 2, losses: 1, ties: 0 }, duels: 3 },
      { opponent: 'Veli', tally: { wins: 0, losses: 0, ties: 1 }, duels: 1 },
    ])
  })
  it('reads back only well-formed records', () => {
    expect(cleanRecords('nope')).toEqual([])
    expect(cleanRecords([rec('1', 'Ali', 'win'), { key: 1 }, null])).toHaveLength(1)
  })
})
