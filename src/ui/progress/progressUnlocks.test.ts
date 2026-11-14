import { describe, expect, it } from 'vitest'
import { progressUnlocks, UNLOCK_ANSWERS } from './progressUnlocks'

describe('what the Progress and Profile screens open, by answers', () => {
  it('no answers: an invitation, nothing else', () => {
    expect(progressUnlocks(0)).toEqual({ empty: true, rhythm: false, skills: false, skillsLeft: UNLOCK_ANSWERS.skills })
  })

  it('the first answers open the rhythm, not yet the skills', () => {
    expect(progressUnlocks(UNLOCK_ANSWERS.rhythm)).toMatchObject({ empty: false, rhythm: true, skills: false })
    expect(progressUnlocks(UNLOCK_ANSWERS.skills - 1)).toMatchObject({ skills: false, skillsLeft: 1 })
  })

  it('enough answers open the skills and the kinds of mistakes', () => {
    expect(progressUnlocks(UNLOCK_ANSWERS.skills)).toEqual({ empty: false, rhythm: true, skills: true, skillsLeft: 0 })
    expect(progressUnlocks(5000).skills).toBe(true)
  })

  it('the thresholds come in order, and odd counts read as none', () => {
    expect(UNLOCK_ANSWERS.rhythm).toBeGreaterThan(0)
    expect(UNLOCK_ANSWERS.skills).toBeGreaterThan(UNLOCK_ANSWERS.rhythm)
    expect(progressUnlocks(-3).empty).toBe(true)
    expect(progressUnlocks(Number.NaN).empty).toBe(true)
  })
})
