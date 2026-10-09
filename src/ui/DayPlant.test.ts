import { describe, expect, it } from 'vitest'
import { dayStage } from './dayPlantStage'

describe('the day plant', () => {
  it('is a seed until the first answer and in bloom only when the task is done', () => {
    expect(dayStage(0, false)).toBe(-1)
    expect(dayStage(0.01, false)).toBe(0)
    expect(dayStage(0.99, false)).toBe(4)
    expect(dayStage(1, false)).toBe(4)
    expect(dayStage(1, true)).toBe(5)
  })

  it('grows a stage for each fifth of the task', () => {
    expect([0.1, 0.25, 0.45, 0.65, 0.85].map((p) => dayStage(p, false))).toEqual([0, 1, 2, 3, 4])
  })
})
