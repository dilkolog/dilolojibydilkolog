import { interleave, type PlanItem } from './dailyPlan'
import { exerciseTypesFor } from './exercises'
import { openMistakes } from './mistakes'
import { pick, shuffle, type Rng } from './rng'
import { ERROR_SKILL, pickExerciseType, unlockedSkills } from './selection'
import type { Mistake, Skill, UserWordState, VocabularyEntry } from './types'

interface Input {
  catalog: readonly VocabularyEntry[]
  states: readonly UserWordState[]
  rng: Rng
  limit?: number
}

function exerciseFor(entry: VocabularyEntry, state: UserWordState, skill: Skill, rng: Rng, reason: PlanItem['reason']): PlanItem {
  // A word edited after practice may have lost the data an exercise needs (e.g. its example).
  const usable = exerciseTypesFor(skill, entry).length ? skill : 'recognition'
  return { kind: 'exercise', entryId: entry.id, reason, skill: usable, exerciseType: pickExerciseType(usable, entry, state, rng) }
}

/**
 * Targeted practice of the Mistake Bank: one item per word with open mistakes, in the skill where
 * the most recent mistake was made (a collocation error is practised as a collocation, etc.).
 */
export function buildMistakePlan({ catalog, states, rng, limit = 15, mistakes }: Input & { mistakes: readonly Mistake[] }): PlanItem[] {
  const byId = new Map(catalog.map((e) => [e.id, e]))
  const stateById = new Map(states.map((s) => [s.entryId, s]))
  const latest = new Map<string, Mistake>()
  for (const m of openMistakes(mistakes)) {
    const prev = latest.get(m.entryId)
    if (!prev || m.lastAt > prev.lastAt) latest.set(m.entryId, m)
  }
  const items: PlanItem[] = []
  for (const m of [...latest.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())) {
    const entry = byId.get(m.entryId)
    const state = stateById.get(m.entryId)
    if (!entry || !state) continue
    const wanted = ERROR_SKILL[m.errorType]
    const skill = unlockedSkills(state, entry).includes(wanted) ? wanted : 'recognition'
    items.push(exerciseFor(entry, state, skill, rng, 'mistake'))
    if (items.length >= limit) break
  }
  return interleave(items, rng)
}

/**
 * Low-stakes free practice over words already being learned, in skills already practised.
 * Meant to be run in 'practice' mode, so it never changes the schedule or the Mistake Bank.
 */
export function buildPracticePlan({ catalog, states, rng, limit = 12 }: Input): PlanItem[] {
  const byId = new Map(catalog.map((e) => [e.id, e]))
  const candidates = shuffle(
    states.filter((s) => byId.has(s.entryId) && Object.keys(s.skills).length > 0),
    rng,
  ).slice(0, limit)
  const items = candidates.map((state) => {
    const entry = byId.get(state.entryId)!
    const skill = pick(Object.keys(state.skills) as Skill[], rng)
    return exerciseFor(entry, state, skill, rng, 'practice')
  })
  return interleave(items, rng)
}
