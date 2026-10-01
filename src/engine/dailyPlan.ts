import { EXERCISES } from './exercises'
import { openMistakes } from './mistakes'
import { createRng, shuffle, type Rng } from './rng'
import type { Scheduler } from './scheduler'
import { dueSkills, ERROR_SKILL, pickExerciseType, startOfDay, unlockedSkills } from './selection'
import {
  type EngineOptions,
  type ExerciseType,
  type Mistake,
  type Skill,
  type TargetLanguage,
  type UserWordState,
  type VocabularyEntry,
} from './types'

export type PlanReason = 'forgotten' | 'mistake' | 'weak' | 'due' | 'new' | 'practice'

export interface PlanItem {
  kind: 'introduce' | 'exercise'
  entryId: string
  reason: PlanReason
  skill: Skill
  exerciseType?: ExerciseType
}

export interface PlanSettings {
  language: TargetLanguage
  dailyMinutes: number
  newWordsPerDay: number
  /** Introduce the user's words most frequent first instead of in the order they were added. */
  frequencyFirst?: boolean
}

export interface PlanInput {
  now: Date
  settings: PlanSettings
  catalog: readonly VocabularyEntry[]
  states: readonly UserWordState[]
  mistakes: readonly Mistake[]
  scheduler: Scheduler
  seed: number
  /** Runtime capabilities (e.g. AI grading available). */
  options?: EngineOptions
}

/** Why the plan has no (more) new words, so the UI can say it instead of looking stuck. */
export type NewWordsBlock = 'limit' | 'backlog' | 'budget' | 'none_left'

export interface DailyPlan {
  items: PlanItem[]
  newEntryIds: string[]
  counts: Record<PlanReason, number>
  bySkill: Partial<Record<Skill, number>>
  estimatedMinutes: number
  /** Words in the vocabulary not yet introduced. */
  waitingNew: number
  /** Set when more words are waiting but none (more) were added today. */
  newBlockedBy?: NewWordsBlock
}

/** Below this recall probability a due word is treated as forgotten and goes first. */
export const FORGOTTEN_R = 0.7
/** Below this it is weak; above it the word is merely due. */
export const WEAK_R = 0.85
/** Words with open mistakes are added even when not due, but capped so they don't crowd the day. */
export const MAX_EXTRA_MISTAKE_ITEMS = 3
/**
 * Interference control: a new word is not introduced while a synonym/antonym/confusable of it
 * was introduced within this many days, so similar words are not encoded side by side.
 */
export const INTERFERENCE_WINDOW_DAYS = 3
/** Minimum distance between a word's introduction and its first test within a session. */
export const INTRO_GAP = 2

const INTRO_COST_MS = 20000
const OVERHEAD_MS = 4000
const DAY_MS = 86_400_000
const REASON_ORDER: PlanReason[] = ['forgotten', 'mistake', 'weak', 'due', 'new', 'practice']

const itemCost = (item: PlanItem) =>
  item.kind === 'introduce' ? INTRO_COST_MS : EXERCISES[item.exerciseType!].expectedMs + OVERHEAD_MS

function interferingIds(entry: VocabularyEntry, catalog: readonly VocabularyEntry[]): Set<string> {
  const kinds = new Set(['synonym', 'antonym', 'confusable'])
  const ids = new Set(entry.relations.filter((r) => kinds.has(r.type)).map((r) => r.targetId))
  for (const other of catalog) {
    if (other.relations.some((r) => kinds.has(r.type) && r.targetId === entry.id)) ids.add(other.id)
  }
  return ids
}

function reviewItems(input: PlanInput, byId: Map<string, VocabularyEntry>, rng: Rng): PlanItem[] {
  const { now, scheduler, settings } = input
  const today = startOfDay(now)
  const yesterday = new Date(today.getTime() - DAY_MS)
  const scored: { item: PlanItem; r: number; fresh: boolean }[] = []
  const extras: { item: PlanItem; lastAt: number; sure: boolean }[] = []

  const states = input.states.filter((s) => s.language === settings.language)
  for (const state of states) {
    const entry = byId.get(state.entryId)
    if (!entry) continue
    const opts = input.options ?? {}
    const due = dueSkills(state, entry, scheduler, now, opts)
    const open = openMistakes(input.mistakes, state.entryId)

    if (due.length) {
      // Only practised skills say anything about forgetting; a freshly unlocked skill scores 0
      // but isn't "weak". A forgotten skill is repaired before a new one is started.
      const practised = due.filter((d) => state.skills[d.skill])
      const r = practised.length ? practised[0].retrievability : 1
      const skill = r < FORGOTTEN_R ? practised[0].skill : due[0].skill
      const reason: PlanReason =
        r < FORGOTTEN_R ? 'forgotten' : open.length ? 'mistake' : r < WEAK_R ? 'weak' : 'due'
      scored.push({
        item: { kind: 'exercise', entryId: entry.id, reason, skill, exerciseType: pickExerciseType(skill, entry, state, rng, opts) },
        r,
        fresh: state.introducedAt >= yesterday && state.introducedAt < today,
      })
    } else if (open.length && (!state.lastReviewAt || state.lastReviewAt < today)) {
      const latest = open.reduce((a, b) => (a.lastAt > b.lastAt ? a : b))
      const wanted = ERROR_SKILL[latest.errorType]
      const skill = unlockedSkills(state, entry, opts).includes(wanted) ? wanted : 'recognition'
      extras.push({
        item: { kind: 'exercise', entryId: entry.id, reason: 'mistake', skill, exerciseType: pickExerciseType(skill, entry, state, rng, opts) },
        lastAt: latest.lastAt.getTime(),
        sure: open.some((m) => m.highConfidence),
      })
    }
  }

  // Due words first (by reason, then weakest), then the most recent not-yet-due mistakes.
  // Within a reason, words met yesterday come first: retrieving them the morning after sleep
  // consolidates what sleep started (Diekelmann & Born 2010).
  const order = (x: { item: PlanItem; r: number; fresh: boolean }) => REASON_ORDER.indexOf(x.item.reason) * 10 + x.r - (x.fresh ? 1 : 0)
  scored.sort((a, b) => order(a) - order(b))
  // Mistakes made while sure come first: correcting a confident error sticks best.
  extras.sort((a, b) => Number(b.sure) - Number(a.sure) || b.lastAt - a.lastAt)
  return [...scored.map((x) => x.item), ...extras.slice(0, MAX_EXTRA_MISTAKE_ITEMS).map((x) => x.item)]
}

function unintroduced(input: PlanInput): VocabularyEntry[] {
  const known = new Set(input.states.map((s) => s.entryId))
  return input.catalog.filter((e) => e.language === input.settings.language && !known.has(e.id))
}

/** Words introduced today in the plan's language (the daily limit is per day, not per session). */
function introducedToday(input: PlanInput): number {
  const today = startOfDay(input.now)
  return input.states.filter((s) => s.language === input.settings.language && s.introducedAt >= today).length
}

/**
 * Next words to introduce. The user's own words come first in the order they were added
 * (choosing them was a deliberate decision); sample words follow by frequency.
 */
export function newWordCandidates(input: PlanInput, limit: number): VocabularyEntry[] {
  const { catalog, states, now } = input
  const pool = unintroduced(input)
  const added = (e: VocabularyEntry) => e.addedAt?.getTime() ?? 0
  // Unknown frequency (0) sorts after every known band.
  const rank = (e: VocabularyEntry) => (e.frequencyRank > 0 ? e.frequencyRank : Infinity)
  const own = pool
    .filter((e) => e.source !== 'sample')
    .sort((a, b) => (input.settings.frequencyFirst ? rank(a) - rank(b) : 0) || added(a) - added(b))
  const samples = pool.filter((e) => e.source === 'sample').sort((a, b) => a.frequencyRank - b.frequencyRank)
  const ordered = [...own, ...samples]

  const windowStart = now.getTime() - INTERFERENCE_WINDOW_DAYS * DAY_MS
  const recent = new Set(
    states.filter((s) => s.introducedAt.getTime() >= windowStart).map((s) => s.entryId),
  )
  const chosen: VocabularyEntry[] = []
  for (const entry of ordered) {
    if (chosen.length >= limit) break
    const blocked = interferingIds(entry, catalog)
    if ([...blocked].some((id) => recent.has(id) || chosen.some((c) => c.id === id))) continue
    chosen.push(entry)
  }
  return chosen
}

/**
 * Interleaving: exercise types are mixed so consecutive items differ in format and word, forcing
 * the learner to "switch gears" each time. A new word's first test is spaced a few items after
 * its introduction so it is retrieved from memory, not from the screen just seen.
 */
export function interleave(items: readonly PlanItem[], rng: Rng): PlanItem[] {
  const pool = shuffle(items, rng)
  const out: PlanItem[] = []
  const introAt = new Map<string, number>()

  const ready = (it: PlanItem) =>
    it.reason !== 'new' || it.kind === 'introduce' || introAt.has(it.entryId)
  const spaced = (it: PlanItem) =>
    it.reason !== 'new' || it.kind === 'introduce' || out.length - introAt.get(it.entryId)! > INTRO_GAP
  const varied = (it: PlanItem) => {
    const prev = out[out.length - 1]
    return !prev || (prev.entryId !== it.entryId && prev.exerciseType !== it.exerciseType)
  }

  while (pool.length) {
    const i =
      [(it: PlanItem) => ready(it) && spaced(it) && varied(it), (it: PlanItem) => ready(it) && spaced(it), ready]
        .map((test) => pool.findIndex(test))
        .find((idx) => idx >= 0) ?? 0
    const [it] = pool.splice(i, 1)
    if (it.kind === 'introduce') introAt.set(it.entryId, out.length)
    out.push(it)
  }
  return out
}

export function buildDailyPlan(input: PlanInput): DailyPlan {
  const rng = createRng(input.seed)
  const byId = new Map(input.catalog.map((e) => [e.id, e]))
  const budget = input.settings.dailyMinutes * 60_000

  const reviews: PlanItem[] = []
  let used = 0
  const allReviews = reviewItems(input, byId, rng)
  for (const it of allReviews) {
    if (used + itemCost(it) > budget) break
    reviews.push(it)
    used += itemCost(it)
  }

  // A review backlog is cleared before new words are added, so the load never snowballs.
  const backlog = reviews.length < allReviews.length
  const newItems: PlanItem[] = []
  const newEntryIds: string[] = []
  const limit = Math.max(0, input.settings.newWordsPerDay - introducedToday(input))
  let budgetHit = false
  if (!backlog) {
    for (const entry of newWordCandidates(input, limit)) {
      const pair = introductionPair(entry, rng)
      const cost = pair.reduce((s, p) => s + itemCost(p), 0)
      if (used + cost > budget) {
        budgetHit = true
        break
      }
      newItems.push(...pair)
      newEntryIds.push(entry.id)
      used += cost
    }
  }
  const waitingNew = unintroduced(input).length - newEntryIds.length
  const newBlockedBy: NewWordsBlock | undefined =
    waitingNew <= 0 ? (newEntryIds.length === 0 ? 'none_left' : undefined)
    : backlog ? 'backlog'
    : budgetHit ? 'budget'
    : limit - newEntryIds.length <= 0 ? 'limit'
    : undefined

  const items = interleave([...reviews, ...newItems], rng)
  const counts = { forgotten: 0, mistake: 0, weak: 0, due: 0, new: 0, practice: 0 }
  const bySkill: Partial<Record<Skill, number>> = {}
  for (const it of items) {
    if (it.kind === 'introduce') continue
    counts[it.reason]++
    bySkill[it.skill] = (bySkill[it.skill] ?? 0) + 1
  }
  return { items, newEntryIds, counts, bySkill, estimatedMinutes: Math.ceil(used / 60_000), waitingNew, newBlockedBy }
}

function introductionPair(entry: VocabularyEntry, rng: Rng): PlanItem[] {
  return [
    { kind: 'introduce', entryId: entry.id, reason: 'new', skill: 'recognition' },
    {
      kind: 'exercise',
      entryId: entry.id,
      reason: 'new',
      skill: 'recognition',
      exerciseType: pickExerciseType('recognition', entry, undefined, rng),
    },
  ]
}

/** "Learn N more now": extra new words beyond today's limit, on the user's explicit request. */
export function buildExtraNewPlan(input: PlanInput, count: number): PlanItem[] {
  const rng = createRng(input.seed)
  return interleave(newWordCandidates(input, count).flatMap((e) => introductionPair(e, rng)), rng)
}
