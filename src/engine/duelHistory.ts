import type { DuelChallenge, DuelResult } from './duel'
import { duelWinner } from './duel'

/** One finished duel, as the learner remembers it (kept on this device only). */
export interface DuelRecord {
  /** The same duel is kept once, however often its link is opened. */
  key: string
  opponent: string
  mine: number
  theirs: number
  outcome: 'win' | 'loss' | 'tie'
  at: string
}

const KEPT = 30

/** The record of a duel between `me` (as `mine`) and the other player. */
export function recordOf(challenge: DuelChallenge, me: DuelResult, other: DuelResult, at: Date): DuelRecord {
  const w = duelWinner(me, other)
  return {
    key: `${challenge.ids.join(',')}|${challenge.from.name}|${challenge.from.score}|${challenge.from.ms}|${challenge.reply?.name ?? ''}|${challenge.reply?.score ?? ''}`,
    opponent: other.name,
    mine: me.score,
    theirs: other.score,
    outcome: w === 'tie' ? 'tie' : w === 'from' ? 'win' : 'loss',
    at: at.toISOString(),
  }
}

/** The new record added in front (the same duel kept once), the oldest dropped. */
export function addRecord(list: readonly DuelRecord[], record: DuelRecord): DuelRecord[] {
  return [record, ...list.filter((r) => r.key !== record.key)].slice(0, KEPT)
}

export interface DuelTally {
  wins: number
  losses: number
  ties: number
}

export function tally(list: readonly DuelRecord[]): DuelTally {
  return list.reduce((t, r) => ({ wins: t.wins + +(r.outcome === 'win'), losses: t.losses + +(r.outcome === 'loss'), ties: t.ties + +(r.outcome === 'tie') }), { wins: 0, losses: 0, ties: 0 })
}

/** The people played against, most duels first, each with their own tally. */
export function byOpponent(list: readonly DuelRecord[]): { opponent: string; tally: DuelTally; duels: number }[] {
  const names = [...new Set(list.map((r) => r.opponent))]
  return names
    .map((opponent) => {
      const mine = list.filter((r) => r.opponent === opponent)
      return { opponent, tally: tally(mine), duels: mine.length }
    })
    .sort((a, b) => b.duels - a.duels || a.opponent.localeCompare(b.opponent, 'tr'))
}

/** A stored list read back: only what has the right shape. */
export function cleanRecords(raw: unknown): DuelRecord[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r): r is DuelRecord => !!r && typeof r.key === 'string' && typeof r.opponent === 'string' && typeof r.mine === 'number' && typeof r.theirs === 'number' && ['win', 'loss', 'tie'].includes(r.outcome) && typeof r.at === 'string')
    .slice(0, KEPT)
}
