import { timeOf, type ReviewEvent, type UserWordState } from './types'

type Counters = Pick<UserWordState['stats'], 'reviews' | 'correct' | 'wrong' | 'hints' | 'totalResponseMs' | 'consecutiveWrong'>

/** A word's counters as its answers tell them: the answers that count are the ones that move the schedule (normal mode). */
export function eventCounters(events: readonly ReviewEvent[]): Map<string, Counters> {
  const by = new Map<string, ReviewEvent[]>()
  for (const e of events) {
    if ((e.mode ?? 'normal') !== 'normal') continue
    const list = by.get(e.entryId)
    if (list) list.push(e)
    else by.set(e.entryId, [e])
  }
  const out = new Map<string, Counters>()
  for (const [id, list] of by) {
    list.sort((a, b) => timeOf(a.timestamp) - timeOf(b.timestamp))
    const c: Counters = { reviews: 0, correct: 0, wrong: 0, hints: 0, totalResponseMs: 0, consecutiveWrong: 0 }
    for (const e of list) {
      const right = e.verdict !== 'wrong'
      c.reviews++
      if (right) c.correct++
      else c.wrong++
      c.hints += e.hintsUsed ?? 0
      c.totalResponseMs += e.responseMs ?? 0
      c.consecutiveWrong = right ? 0 : c.consecutiveWrong + 1
    }
    out.set(id, c)
  }
  return out
}

/**
 * Counters after a sync. Two devices each add to a word's counts while apart; the merge keeps the
 * larger of the two, so the other device's answers would go uncounted. The answers themselves
 * are all kept, so the counts are taken from them where they say more. Never lowered: a count from
 * before the answers were kept stays. The run of wrong answers is the answers' own (the latest).
 */
export function raiseCounters(states: readonly UserWordState[], events: readonly ReviewEvent[]): UserWordState[] {
  const counted = eventCounters(events)
  return states.map((s) => {
    const c = counted.get(s.entryId)
    if (!c || c.reviews <= s.stats.reviews) return s
    return {
      ...s,
      stats: {
        reviews: c.reviews,
        correct: Math.max(s.stats.correct, c.correct),
        wrong: Math.max(s.stats.wrong, c.wrong),
        hints: Math.max(s.stats.hints, c.hints),
        totalResponseMs: Math.max(s.stats.totalResponseMs, c.totalResponseMs),
        consecutiveWrong: c.consecutiveWrong,
      },
    }
  })
}
