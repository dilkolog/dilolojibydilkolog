import { describe, expect, it } from 'vitest'
import type { PlanItem } from '../dailyPlan'
import { EXERCISES } from '../exercises'
import { createRng } from '../rng'
import { adaptExercise, completeItem, GRADUATED_GAPS, startSession } from '../session'
import { decision } from './fixtures'
import type { Verdict } from '../types'

const ex = (exerciseType: PlanItem['exerciseType'], entryId = decision.id): PlanItem => ({ kind: 'exercise', entryId, reason: 'new', skill: EXERCISES[exerciseType!].skill, exerciseType })
const intro = (entryId: string): PlanItem => ({ kind: 'introduce', entryId, reason: 'new', skill: 'recognition' })
const filler = (n: number) => Array.from({ length: n }, (_, i) => ex('mc_meaning', `en:f${i}`))

describe('85 % rule', () => {
  const rng = createRng(1)
  it('asks a harder format when nearly everything is right, an easier one when much goes wrong', () => {
    const allRight: Verdict[] = Array(8).fill('correct')
    const harder = adaptExercise(ex('listen_choose'), decision, undefined, allRight, rng)
    expect(EXERCISES[harder.exerciseType!].input).not.toBe('choice')
    expect(EXERCISES[harder.exerciseType!].skill).toBe('listening')
    const struggling: Verdict[] = ['wrong', 'correct', 'wrong', 'wrong', 'correct', 'wrong']
    const easier = adaptExercise(ex('listen_type'), decision, undefined, struggling, rng)
    expect(easier.exerciseType).toBe('listen_choose')
    // Recognition has only choice formats: nothing harder to switch to, so it stays.
    const rec = ex('mc_meaning')
    expect(adaptExercise(rec, decision, undefined, allRight, rng)).toBe(rec)
  })

  it('leaves things alone in the 75–90 % band or with too few answers', () => {
    const item = ex('mc_meaning')
    expect(adaptExercise(item, decision, undefined, ['correct', 'correct', 'wrong', 'correct', 'correct', 'correct', 'wrong', 'correct'], rng)).toBe(item)
    expect(adaptExercise(item, decision, undefined, ['correct', 'correct'], rng)).toBe(item)
  })
})

describe('graduated recall within a session', () => {
  it('brings a new word back at growing gaps, as practice, only while it is new and right', () => {
    let s = startSession([intro(decision.id), ex('mc_meaning'), ...filler(12)])
    s = completeItem(s, { entryId: decision.id })
    const followUp = ex('typed_translation')
    s = completeItem(s, { entryId: decision.id, verdict: 'correct' }, undefined, followUp)
    const first = s.items.findIndex((it, i) => i >= s.index && it.entryId === decision.id)
    expect(first - s.index).toBe(GRADUATED_GAPS[0])
    expect(s.items[first].reason).toBe('practice')
    // Not for a word that wasn't introduced in this session.
    const other = completeItem(startSession([ex('mc_meaning'), ...filler(5)]), { entryId: decision.id, verdict: 'correct' }, undefined, followUp)
    expect(other.items.filter((it) => it.entryId === decision.id)).toHaveLength(1)
  })
})
