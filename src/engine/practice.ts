import { interleave, type PlanItem } from './dailyPlan'
import { exerciseTypesFor } from './exercises'
import { openMistakes } from './mistakes'
import { pick, shuffle, type Rng } from './rng'
import type { Scheduler } from './scheduler'
import { dueSkills, ERROR_SKILL, pickExerciseType, unlockedSkills } from './selection'
import type { EngineOptions, Mistake, Skill, UserWordState, VocabularyEntry } from './types'

interface Input {
  catalog: readonly VocabularyEntry[]
  states: readonly UserWordState[]
  rng: Rng
  limit?: number
  options?: EngineOptions
}

function exerciseFor(
  entry: VocabularyEntry,
  state: UserWordState,
  skill: Skill,
  rng: Rng,
  reason: PlanItem['reason'],
  opts: EngineOptions = {},
): PlanItem {
  // A word edited after practice may have lost the data an exercise needs (e.g. its example).
  const usable = exerciseTypesFor(skill, entry, opts).length ? skill : 'recognition'
  return { kind: 'exercise', entryId: entry.id, reason, skill: usable, exerciseType: pickExerciseType(usable, entry, state, rng, opts) }
}

/**
 * Targeted practice of the Mistake Bank: one item per word with open mistakes, in the skill where
 * the most recent mistake was made (a collocation error is practised as a collocation, etc.).
 */
export function buildMistakePlan({ catalog, states, rng, limit = 15, mistakes, options = {} }: Input & { mistakes: readonly Mistake[] }): PlanItem[] {
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
    const skill = unlockedSkills(state, entry, options).includes(wanted) ? wanted : 'recognition'
    items.push(exerciseFor(entry, state, skill, rng, 'mistake', options))
    if (items.length >= limit) break
  }
  return interleave(items, rng)
}

/**
 * Low-stakes free practice over words already being learned, in skills already practised.
 * Meant to be run in 'practice' mode, so it never changes the schedule or the Mistake Bank.
 */
export function buildPracticePlan({ catalog, states, rng, limit = 12, options = {} }: Input): PlanItem[] {
  const byId = new Map(catalog.map((e) => [e.id, e]))
  const candidates = shuffle(
    states.filter((s) => byId.has(s.entryId) && Object.keys(s.skills).length > 0),
    rng,
  ).slice(0, limit)
  const items = candidates.map((state) => {
    const entry = byId.get(state.entryId)!
    const skill = pick(Object.keys(state.skills) as Skill[], rng)
    return exerciseFor(entry, state, skill, rng, 'practice', options)
  })
  return interleave(items, rng)
}

/**
 * Study one deck (e.g. a tag) now: every word gets one item — its weakest due skill, or for an
 * unseen word an introduction plus a first test. Normal mode: it counts like regular reviews.
 */
export function buildDeckPlan({
  catalog,
  states,
  rng,
  scheduler,
  now,
  limit = 20,
  options = {},
}: Input & { scheduler: Scheduler; now: Date }): PlanItem[] {
  const stateById = new Map(states.map((s) => [s.entryId, s]))
  const items: PlanItem[] = []
  for (const entry of shuffle(catalog, rng).slice(0, limit)) {
    const state = stateById.get(entry.id)
    if (!state) {
      items.push({ kind: 'introduce', entryId: entry.id, reason: 'new', skill: 'recognition' })
      items.push({ kind: 'exercise', entryId: entry.id, reason: 'new', skill: 'recognition', exerciseType: pickExerciseType('recognition', entry, undefined, rng, options) })
      continue
    }
    // Due skills first; otherwise the weakest skill practised so far.
    const due = dueSkills(state, entry, scheduler, now, options)
    const practised = unlockedSkills(state, entry, options)
      .filter((sk) => state.skills[sk])
      .sort((a, b) => scheduler.retrievability(state.skills[a]!, now) - scheduler.retrievability(state.skills[b]!, now))
    const skill = due[0]?.skill ?? practised[0] ?? 'recognition'
    items.push(exerciseFor(entry, state, skill, rng, due.length ? 'due' : 'weak', options))
  }
  return interleave(items, rng)
}
