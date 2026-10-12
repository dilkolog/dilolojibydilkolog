import { describe, expect, it } from 'vitest'
import { acceptedForms, fallSpeed, isOver, MAX_DROPS, newGravity, pointsFor, spawnGap, START_LIVES, stepGravity, submitGravity } from '../gravity'
import { createRng } from '../rng'
import { affect, decide, decision, effect } from './fixtures'

const rng = createRng(1)
const words = [decision, decide, affect, effect]

describe('gravity', () => {
  it('drops appear one by one as time passes, and fall', () => {
    let s = newGravity(words)
    s = stepGravity(s, 1, rng)
    expect(s.drops).toHaveLength(1)
    expect(s.queue).toHaveLength(3)
    const y0 = s.drops[0].y
    s = stepGravity(s, 1, rng)
    expect(s.drops[0].y).toBeGreaterThan(y0)
  })

  it('a drop that lands costs a life, breaks the streak and is remembered as missed', () => {
    let s = { ...newGravity([decision]), streak: 4 }
    s = stepGravity(s, 1, rng)
    for (let i = 0; i < 40 && s.lives === START_LIVES; i++) s = stepGravity(s, 0.5, rng)
    expect(s.lives).toBe(START_LIVES - 1)
    expect(s.streak).toBe(0)
    expect(s.missed.map((e) => e.id)).toEqual([decision.id])
  })

  it('typing a falling word solves it; the lowest of two equal drops goes first; nothing falling, nothing happens', () => {
    let s = newGravity([decision, decision])
    s = stepGravity(s, 1, rng)
    s = stepGravity(s, 6, rng)
    s = stepGravity(s, 1, rng)
    expect(s.drops).toHaveLength(2)
    const low = [...s.drops].sort((a, b) => b.y - a.y)[0]
    const r = submitGravity(s, 'DECISION ')
    expect(r.hit?.id).toBe(low.id)
    expect(r.state.drops).toHaveLength(1)
    expect(r.state.score).toBeGreaterThan(0)
    expect(r.state.streak).toBe(1)
    expect(submitGravity(s, 'xyz').state).toBe(s)
    expect(submitGravity(s, '').state).toBe(s)
  })

  it('accents and the article do not matter while typing fast', () => {
    const forms = acceptedForms({ ...decision, lemma: 'café', article: 'le' })
    expect(forms).toContain('cafe')
    expect(forms).toContain('le cafe')
  })

  it('never more than MAX_DROPS at once; over when the lives are gone or everything has been played', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...decision, id: `w${i}`, lemma: `w${i}` }))
    let s = newGravity(many)
    for (let i = 0; i < 20; i++) s = stepGravity({ ...s, nextIn: 0 }, 0.01, rng)
    expect(s.drops.length).toBeLessThanOrEqual(MAX_DROPS)
    expect(isOver({ ...s, lives: 0 })).toBe(true)
    expect(isOver(newGravity([]))).toBe(true)
    expect(isOver(newGravity(words))).toBe(false)
  })

  it('gets faster and busier, with a ceiling; higher catches and streaks pay more', () => {
    expect(fallSpeed(100)).toBeGreaterThan(fallSpeed(0))
    expect(fallSpeed(10_000)).toBeLessThanOrEqual(0.32)
    expect(spawnGap(100)).toBeLessThan(spawnGap(0))
    expect(spawnGap(10_000)).toBeGreaterThanOrEqual(1.4)
    const d = { id: 1, entry: decision, x: 0.5, y: 0.1, prompt: '' }
    expect(pointsFor(d, 5)).toBeGreaterThan(pointsFor(d, 0))
    expect(pointsFor(d, 0)).toBeGreaterThan(pointsFor({ ...d, y: 0.9 }, 0))
  })
})
