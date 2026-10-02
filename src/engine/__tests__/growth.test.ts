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
