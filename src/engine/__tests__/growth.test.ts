import { describe, expect, it } from 'vitest'
import { growthStage, plantHealth, projectStage } from '../growth'
import { newWordState, processAttempt } from '../review'
import { createScheduler } from '../scheduler'
import { decision } from './fixtures'

const scheduler = createScheduler({ fuzz: false })
const T0 = new Date('2026-10-01T09:00:00')

describe('growth', () => {
  it('a brand-new word needs several spaced correct answers over weeks to be mastered', () => {
    const s = newWordState(decision, T0)
    const next = projectStage(s, decision, scheduler, T0)!
    expect(next.stage).toBe('familiar')
    const mastered = projectStage(s, decision, scheduler, T0, {}, 'mastered')!
    expect(mastered.reviews).toBeGreaterThan(next.reviews)
    expect((mastered.date.getTime() - T0.getTime()) / 86_400_000).toBeGreaterThan(14)
    console.log(`decision → mastered: ${mastered.reviews} correct answers, ${Math.round((mastered.date.getTime() - T0.getTime()) / 86_400_000)} days`)
  })

  it('mastery is out of reach without any production exercise', () => {
    const bare = { ...decision, senses: [{ ...decision.senses[0], examples: [] }], wordFamily: [] }
    expect(projectStage(newWordState(bare, T0), bare, scheduler, T0, {}, 'mastered')).toBeUndefined()
  })

  it('health follows recall probability: fresh after a review, wilting long after', () => {
    let s = newWordState(decision, T0)
    s = processAttempt(s, { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 2000, hintsUsed: 0, maxHints: 0, at: T0 }, [], scheduler).state
    expect(growthStage(s)).toBe(0)
    expect(plantHealth(s, scheduler, T0)).toBe('fresh')
    expect(plantHealth(s, scheduler, new Date(T0.getTime() + 60 * 86_400_000))).toBe('wilting')
    expect(growthStage(undefined)).toBe(-1)
  })
})

describe('gardenSummary', () => {
  it('counts plants by stage and lists the driest words to water first', async () => {
    const { gardenSummary } = await import('../growth')
    const { decide, abandon } = await import('./fixtures')
    const at = (d: number) => new Date(T0.getTime() + d * 86_400_000)
    let a = newWordState(decision, T0)
    a = processAttempt(a, { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 2000, hintsUsed: 0, maxHints: 0, at: T0 }, [], scheduler).state
    let b = newWordState(decide, at(25))
    b = processAttempt(b, { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 2000, hintsUsed: 0, maxHints: 0, at: at(25) }, [], scheduler).state
    const g = gardenSummary([decision, decide, abandon], [a, b], scheduler, at(30))
    expect(g.seeds).toBe(1)
    expect(g.byStage[0]).toBe(2)
    expect(g.toWater[0]).toBe('en:decision')
    expect(g.wilting + g.thirsty).toBe(g.toWater.length)
  })
})
