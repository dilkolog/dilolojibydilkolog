import { State } from 'ts-fsrs'
import { interleave, type PlanItem } from './dailyPlan'
import { exerciseTypesFor } from './exercises'
import { openMistakes } from './mistakes'
import { normalize } from './answerCheck'
import { nextReviewAt } from './review'
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
 * Early review of upcoming words before their scheduled review time arrives.
 * Orders words by their earliest upcoming review timestamp so that items closest
 * to expiring are reviewed first. Runs in 'normal' mode so FSRS recalculates
 * stability and pushes the review interval forward.
 */
export function buildEarlyReviewPlan({
  catalog,
  states,
  rng,
  scheduler,
  now,
  limit = 15,
  options = {},
}: Input & { scheduler: Scheduler; now: Date }): PlanItem[] {
  const byId = new Map(catalog.map((e) => [e.id, e]))
  const upcoming = states
    .filter((s) => !s.retired && byId.has(s.entryId) && Object.keys(s.skills).length > 0)
    .map((s) => ({ state: s, due: nextReviewAt(s) }))
    .filter((x): x is { state: UserWordState; due: Date } => x.due !== undefined)
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, limit)

  const items: PlanItem[] = []
  for (const { state } of upcoming) {
    const entry = byId.get(state.entryId)!
    const due = dueSkills(state, entry, scheduler, now, options)
    const practised = unlockedSkills(state, entry, options)
      .filter((sk) => state.skills[sk])
      .sort((a, b) => {
        const cardA = state.skills[a]!
        const cardB = state.skills[b]!
        const dueDiff = cardA.due.getTime() - cardB.due.getTime()
        if (dueDiff !== 0) return dueDiff
        return scheduler.retrievability(cardA, now) - scheduler.retrievability(cardB, now)
      })
    const skill = due[0]?.skill ?? practised[0] ?? 'recognition'
    items.push(exerciseFor(entry, state, skill, rng, due.length ? 'due' : 'weak', options))
  }
  return interleave(items, rng)
}

/** The word's card for `skill` is due: a game's answer on it is a real review. */
export function isDueFor(state: UserWordState, skill: Skill, now: Date): boolean {
  const card = state.skills[skill]
  return !!card && !state.retired && new Date(card.due).getTime() <= now.getTime()
}

/**
 * Words for quick games: words whose recognition review is due first (a game then does the
 * review's work), then the words being learned, weakest first with some randomness, topped up with
 * not-yet-learned words when the learner has too few.
 */
export function pickGameWords(
  catalog: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  count: number,
  rng: Rng,
  now = new Date(),
): VocabularyEntry[] {
  const learned = new Set(states.map((s) => s.entryId))
  const due = new Set(states.filter((s) => isDueFor(s, 'recognition', now)).map((s) => s.entryId))
  const wrongs = new Map(states.map((s) => [s.entryId, s.stats.wrong / Math.max(1, s.stats.reviews)]))
  const known = shuffle(catalog.filter((e) => learned.has(e.id) && !due.has(e.id)), rng).sort((a, b) => (wrongs.get(b.id) ?? 0) - (wrongs.get(a.id) ?? 0))
  // Due words first; then the weakest half, the rest random, so games stay varied.
  const dueFirst = shuffle(catalog.filter((e) => due.has(e.id)), rng)
  const rest = Math.max(0, count - dueFirst.length)
  const picked = [...dueFirst, ...known.slice(0, Math.ceil(rest / 2)), ...shuffle(known.slice(Math.ceil(rest / 2)), rng)]
  const extra = shuffle(catalog.filter((e) => !learned.has(e.id)), rng)
  // Distinct meanings, so a meaning tile can match only one word.
  const out: VocabularyEntry[] = []
  for (const e of [...picked, ...extra]) {
    if (out.length >= count) break
    if (!out.some((o) => normalize(o.senses[0].gloss) === normalize(e.senses[0].gloss))) out.push(e)
  }
  return out
}

// ---------------------------------------------------------------------------
// Fluency
// ---------------------------------------------------------------------------

/** Fewest well-known words a fluency round needs to stay varied. */
export const FLUENCY_MIN_WORDS = 6

/**
 * Fluency practice works only on words that are already known (Nation's fluency strand): the
 * goal is not learning but making retrieval fast and automatic. "Known" = recognition has
 * graduated and most answers on the word have been right.
 */
export function pickFluencyWords(catalog: readonly VocabularyEntry[], states: readonly UserWordState[], rng: Rng): VocabularyEntry[] {
  const known = new Set(
    states
      .filter((s) => s.skills.recognition?.state === State.Review && s.stats.correct >= 0.7 * s.stats.reviews)
      .map((s) => s.entryId),
  )
  const out: VocabularyEntry[] = []
  for (const e of shuffle(catalog.filter((c) => known.has(c.id)), rng)) {
    if (!out.some((o) => normalize(o.senses[0].gloss) === normalize(e.senses[0].gloss))) out.push(e)
  }
  return out
}

export function median(values: readonly number[]): number {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// ---------------------------------------------------------------------------
// Audio review
// ---------------------------------------------------------------------------

export type AudioSet = 'weak' | 'today' | 'all'

/**
 * Words for hands-free listening: the weakest learned words first (lowest recall probability),
 * today's new words, or a shuffled mix of everything learned.
 */
export function pickAudioWords(
  catalog: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  scheduler: Scheduler,
  now: Date,
  set: AudioSet,
  rng: Rng,
  limit = 20,
): VocabularyEntry[] {
  const byId = new Map(catalog.map((e) => [e.id, e]))
  const learned = states.filter((s) => byId.has(s.entryId) && Object.keys(s.skills).length > 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const weakest = (s: UserWordState) => Math.min(...Object.values(s.skills).map((c) => scheduler.retrievability(c, now)))
  const chosen =
    set === 'today'
      ? learned.filter((s) => s.introducedAt >= today)
      : set === 'weak'
        ? [...learned].sort((a, b) => weakest(a) - weakest(b))
        : shuffle(learned, rng)
  return chosen.slice(0, limit).map((s) => byId.get(s.entryId)!)
}
