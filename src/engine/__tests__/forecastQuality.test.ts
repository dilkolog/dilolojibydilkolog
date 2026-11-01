import { describe, expect, it } from 'vitest'
import { aucOf, forecastReport, forecastScore, skillWord } from '../forecastQuality'
import type { ReviewEvent } from '../types'

let n = 0
const ev = (p: number, right: boolean, over: Partial<ReviewEvent> = {}): ReviewEvent =>
  ({ id: String(n++), retrievabilityBefore: p, verdict: right ? 'correct' : 'wrong', mode: 'normal', exerciseType: 'typed_translation', ...over }) as unknown as ReviewEvent

/** `size` answers whose real recall rate is `rate`, forecast at `p`. */
const batch = (p: number, rate: number, size: number, over: Partial<ReviewEvent> = {}) => Array.from({ length: size }, (_, i) => ev(p, i / size < rate, over))

describe('auc', () => {
  it('is 1 for a perfect ranking, 0.5 for none and handles ties', () => {
    expect(aucOf([{ p: 0.9, y: true }, { p: 0.2, y: false }])).toBe(1)
    expect(aucOf([{ p: 0.5, y: true }, { p: 0.5, y: false }])).toBe(0.5)
    expect(aucOf([{ p: 0.2, y: true }, { p: 0.9, y: false }])).toBe(0)
    expect(aucOf([{ p: 0.5, y: true }])).toBeNull()
  })
})

describe('forecast score', () => {
  it('a forecast that matches reality has a small gap and beats the plain average', () => {
    const s = forecastScore([...batch(0.95, 0.95, 200), ...batch(0.6, 0.6, 200)])!
    expect(s.n).toBe(400)
    expect(s.ece).toBeLessThan(0.02)
    expect(s.skill).toBeGreaterThan(0.1)
    expect(s.auc!).toBeGreaterThan(0.6)
  })

  it('an overconfident forecast scores worse, and its gap shows', () => {
    const honest = forecastScore([...batch(0.9, 0.9, 200), ...batch(0.5, 0.5, 200)])!
    const bold = forecastScore([...batch(0.99, 0.9, 200), ...batch(0.9, 0.5, 200)])!
    expect(bold.logLoss).toBeGreaterThan(honest.logLoss)
    expect(bold.brier).toBeGreaterThan(honest.brier)
    expect(bold.ece).toBeGreaterThan(0.2)
    expect(bold.meanPredicted).toBeGreaterThan(bold.meanActual)
  })

  it('a forecast that says the same to everyone adds nothing over the average', () => {
    const s = forecastScore(batch(0.8, 0.8, 300))!
    expect(Math.abs(s.skill)).toBeLessThan(0.02)
    expect(s.auc).toBeGreaterThan(0.4)
    expect(s.auc).toBeLessThan(0.6)
  })

  it('says nothing about too few answers, or answers with no forecast', () => {
    expect(forecastScore(batch(0.9, 0.9, 10))).toBeNull()
    expect(forecastScore(batch(0, 0.5, 100))).toBeNull()
  })
})

describe('the report', () => {
  it('keeps scheduled reviews, typed ones and probes apart', () => {
    const events = [
      ...batch(0.9, 0.9, 60),
      ...batch(0.9, 0.7, 60, { exerciseType: 'mc_meaning' }),
      ...batch(0.7, 0.7, 30, { mode: 'practice', ctx: { probe: 0.05, elapsedDays: 4, stabilityBefore: 8, difficultyBefore: 5, policy: 'heuristic-v1' } }),
    ]
    const r = forecastReport(events)
    expect(r.scheduled!.n).toBe(120)
    expect(r.typed!.n).toBe(60)
    expect(r.probes!.n).toBe(30)
    expect(forecastReport(events.slice(0, 50)).probes).toBeNull()
  })
})

describe('plain words', () => {
  it('names the skill', () => {
    expect(skillWord(-0.1)).toContain('kötü')
    expect(skillWord(0.01)).toContain('pek farklı değil')
    expect(skillWord(0.1)).toContain('biraz')
    expect(skillWord(0.4)).toContain('belirgin')
  })
})
