import { interleave, type PlanItem } from './dailyPlan'
import { exerciseTypesFor } from './exercises'
import { openMistakes } from './mistakes'
import { normalize } from './answerCheck'
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

/**
 * Words for quick games: words being learned, weakest first with some randomness, topped up with
 * not-yet-learned words when the learner has too few.
 */
export function pickGameWords(
  catalog: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  count: number,
  rng: Rng,
): VocabularyEntry[] {
  const learned = new Set(states.map((s) => s.entryId))
  const wrongs = new Map(states.map((s) => [s.entryId, s.stats.wrong / Math.max(1, s.stats.reviews)]))
  const known = shuffle(catalog.filter((e) => learned.has(e.id)), rng).sort((a, b) => (wrongs.get(b.id) ?? 0) - (wrongs.get(a.id) ?? 0))
  // Weakest half first, the rest random, so games stay varied.
  const picked = [...known.slice(0, Math.ceil(count / 2)), ...shuffle(known.slice(Math.ceil(count / 2)), rng)]
  const extra = shuffle(catalog.filter((e) => !learned.has(e.id)), rng)
  // Distinct meanings, so a meaning tile can match only one word.
  const out: VocabularyEntry[] = []
  for (const e of [...picked, ...extra]) {
    if (out.length >= count) break
    if (!out.some((o) => normalize(o.senses[0].gloss) === normalize(e.senses[0].gloss))) out.push(e)
  }
  return out
}
