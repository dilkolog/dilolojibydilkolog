import { describe, expect, it } from 'vitest'
import { newWordState } from '../engine/review'
import { decision } from '../engine/__tests__/fixtures'
import { dueLabel } from './dueLabel'

const now = new Date('2026-11-07T10:00:00')

describe('dueLabel', () => {
  it('a word introduced but never answered is new, not retired', () => {
    const st = newWordState(decision, now)
    expect(dueLabel(st, undefined, now)).toBe('yeni')
  })

  it('only a word the learner retired says so', () => {
    const st = { ...newWordState(decision, now), retired: true }
    expect(dueLabel(st, undefined, now)).toBe('emekli')
  })

  it('a word with a review date says when it comes back', () => {
    const st = newWordState(decision, now)
    expect(dueLabel(st, new Date('2026-11-07T20:00:00'), now)).toBe('bugün')
    expect(dueLabel(st, new Date('2026-11-08T09:00:00'), now)).toBe('yarın')
    expect(dueLabel(st, new Date('2026-11-12T09:00:00'), now)).toBe('5 gün')
  })
})
