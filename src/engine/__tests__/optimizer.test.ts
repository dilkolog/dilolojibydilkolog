import { createEmptyCard, default_w, fsrs, generatorParameters, type Grade } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { fitWeights, historiesFrom, logLoss, scoredReviews, type History } from '../optimizer'
import { createRng } from '../rng'
import type { ReviewEvent } from '../types'

const DAY = 86_400_000

/** A simulated learner whose memory follows `trueW`, reviewing at irregular times. */
function simulate(trueW: number[], cards: number, seed: number): History[] {
  const f = fsrs(generatorParameters({ w: trueW, enable_fuzz: false }))
  const rng = createRng(seed)
  const out: History[] = []
  for (let c = 0; c < cards; c++) {
    let t = Date.UTC(2026, 0, 1) + c * 3600_000
    let card = createEmptyCard(new Date(t))
    const h: History = [{ at: t, rating: 3 }]
    card = f.next(card, new Date(t), 3).card
    for (let i = 0; i < 8; i++) {
      const gap = Math.max(1, card.scheduled_days) * (0.5 + rng() * 2.5)
      t += gap * DAY
      const r = f.get_retrievability(card, new Date(t), false)
      const rating: Grade = rng() < r ? 3 : 1
      h.push({ at: t, rating })
      card = f.next(card, new Date(t), rating).card
    }
    out.push(h)
  }
  return out
}

describe('FSRS optimizer', () => {
  it('fits a learner who forgets differently from the average and predicts unseen cards better', () => {
    // This learner keeps new words much longer than default and forgets more slowly.
    const trueW = [...default_w]
    for (let i = 0; i < 4; i++) trueW[i] *= 4
    const histories = simulate(trueW, 600, 7)
    const fit = fitWeights(histories)
    expect(fit.fittedLoss).toBeLessThan(fit.defaultLoss)
    expect(fit.improvement).toBeGreaterThan(0.005)
    // It found the real difference: first-day memories last much longer than the default assumes.
    expect(fit.weights[2]).toBeGreaterThan(default_w[2] * 2)
    expect(logLoss(fit.weights, histories)).toBeLessThan(logLoss(default_w, histories))
  })

  it('builds per-card histories from real answers only', () => {
    const ev = (entryId: string, skill: string, day: number, rating: number, mode = 'normal') =>
      ({ entryId, skill, rating, mode, timestamp: new Date(Date.UTC(2026, 0, day)) }) as unknown as ReviewEvent
    const h = historiesFrom([ev('a', 'recall', 3, 3), ev('a', 'recall', 1, 3), ev('a', 'recognition', 1, 3), ev('a', 'recall', 5, 1, 'practice')])
    expect(h).toHaveLength(1)
    expect(h[0].map((r) => new Date(r.at).getUTCDate())).toEqual([1, 3])
    expect(scoredReviews(h)).toBe(1)
  })
})
