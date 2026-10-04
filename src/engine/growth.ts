import { Rating, State, type Card } from 'ts-fsrs'
import { MASTERED_STABILITY_DAYS, MASTERY_STAGES, masteryStage, PRODUCTION_READY_STABILITY_DAYS, STRONG_STABILITY_DAYS, type MasteryStage } from './mastery'
import type { Scheduler } from './scheduler'
import { startOfDay, unlockedSkills } from './selection'
import type { EngineOptions, Skill, UserWordState, VocabularyEntry } from './types'

/**
 * The word as a plant. Unlike a fixed "plant 6 times, then water" ladder, both dimensions come
 * from the memory model:
 * - growth = mastery stage, which needs durable memory (FSRS stability) in each skill in turn;
 * - health = how likely the word is to be recalled right now, so a plant wilts exactly when the
 *   word is being forgotten, and a review "waters" it.
 */

export type Health = 'fresh' | 'thirsty' | 'wilting'

export function growthStage(state: UserWordState | undefined): number {
  return state ? MASTERY_STAGES.indexOf(masteryStage(state)) : -1
}

/** ts-fsrs's default learning steps (1m, 10m) and relearning step (10m). */
const STEPS = { learning: 2, relearning: 1 }

/**
 * How far a card is towards graduating (its learning step: good answers move it on, a miss sends
 * it back) or, once graduated, towards a stability goal in days.
 */
function toward(card: Card | undefined, days?: number): number {
  if (!card) return 0
  if (card.state !== State.Review) return (card.learning_steps ?? 0) / (card.state === State.Relearning ? STEPS.relearning + 1 : STEPS.learning)
  return days ? Math.min(1, card.stability / days) : 1
}

/**
 * 0–1: how far the word is towards its next growth stage, from the same conditions as
 * masteryStage (each needed card's progress, averaged so that every gain shows). 1 when in full
 * bloom. Shown as the ring around the plant during a session.
 */
export function stageProgress(state: UserWordState | undefined): number {
  if (!state) return 0
  const { recognition, recall, production } = state.skills
  const mean = (...xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  switch (masteryStage(state)) {
    case 'introduced':
      return toward(recognition)
    case 'familiar':
      return toward(recall)
    case 'recallable':
      return mean(toward(recognition, STRONG_STABILITY_DAYS), toward(recall, STRONG_STABILITY_DAYS))
    case 'strong':
      return mean(toward(recall, STRONG_STABILITY_DAYS), toward(production, PRODUCTION_READY_STABILITY_DAYS))
    case 'production_ready':
      return mean(...[recognition, recall, production].map((c) => toward(c, MASTERED_STABILITY_DAYS)))
    case 'mastered':
      return 1
  }
}

/** Recall probability of the weakest practised skill, judged as plant health. */
export function plantHealth(state: UserWordState | undefined, scheduler: Scheduler, now: Date): Health {
  const cards = Object.values(state?.skills ?? {}).filter((c) => c.reps > 0)
  if (!cards.length) return 'fresh'
  const r = Math.min(...cards.map((c) => scheduler.retrievability(c, now)))
  return r >= 0.85 ? 'fresh' : r >= 0.7 ? 'thirsty' : 'wilting'
}

export interface Milestone {
  stage: MasteryStage
  /** Correct answers still needed, if each comes when it is due. */
  reviews: number
  /** Earliest date the stage can be reached: durable memory needs time, not just answers. */
  date: Date
}

const DAY = 86_400_000
/** The skills mastery stages are built on; the others are practised but don't move growth. */
const GROWTH_SKILLS: readonly Skill[] = ['recognition', 'recall', 'production']

/**
 * Projects the path to `target` (default: the next stage): every unlocked skill is reviewed
 * when it falls due and answered correctly, until the stage is reached. Returns undefined when
 * the stage can't be reached with the word's current data (e.g. no exercise for production).
 */
export function projectStage(
  state: UserWordState,
  entry: VocabularyEntry,
  scheduler: Scheduler,
  now: Date,
  opts: EngineOptions = {},
  target?: MasteryStage,
): Milestone | undefined {
  // A what-if run: it must not book load on the real calendar.
  scheduler = scheduler.plain?.() ?? scheduler
  const goal = target ?? MASTERY_STAGES[Math.min(MASTERY_STAGES.length - 1, growthStage(state) + 1)]
  const goalIndex = MASTERY_STAGES.indexOf(goal)
  let s: UserWordState = { ...state, skills: { ...state.skills } }
  let t = now
  let reviews = 0
  for (let i = 0; i < 80 && MASTERY_STAGES.indexOf(masteryStage(s)) < goalIndex; i++) {
    // The next review is whichever unlocked skill falls due first; a newly unlocked skill
    // becomes due the day after the last practice (as in the real plan).
    const candidates = unlockedSkills(s, entry, opts)
      .filter((skill) => GROWTH_SKILLS.includes(skill))
      .map((skill) => {
      const card = s.skills[skill]
      const due = card ? card.due : new Date(startOfDay(new Date((s.lastReviewAt ?? t).getTime() + DAY)).getTime() + 9 * 3600_000)
      return { skill, due: due < t ? t : due }
    })
    if (!candidates.length) return undefined
    const next = candidates.sort((a, b) => a.due.getTime() - b.due.getTime())[0]
    const skill: Skill = next.skill
    t = next.due
    const card = s.skills[skill] ?? scheduler.newCard(t)
    s = { ...s, skills: { ...s.skills, [skill]: scheduler.review(card, Rating.Good, t) }, lastReviewAt: t }
    reviews++
  }
  return MASTERY_STAGES.indexOf(masteryStage(s)) >= goalIndex ? { stage: goal, reviews, date: t } : undefined
}

export interface GardenSummary {
  /** Plants per growth stage (index 0–5); not-yet-planted words are counted apart. */
  byStage: number[]
  seeds: number
  thirsty: number
  wilting: number
  /** Words to water, driest first. */
  toWater: string[]
}

export function gardenSummary(
  vocabulary: readonly VocabularyEntry[],
  states: readonly UserWordState[],
  scheduler: Scheduler,
  now: Date,
): GardenSummary {
  const stateById = new Map(states.map((s) => [s.entryId, s]))
  const byStage = MASTERY_STAGES.map(() => 0)
  let seeds = 0
  let thirsty = 0
  let wilting = 0
  const dry: { id: string; r: number }[] = []
  for (const e of vocabulary) {
    const s = stateById.get(e.id)
    if (!s) {
      seeds++
      continue
    }
    byStage[growthStage(s)]++
    const h = plantHealth(s, scheduler, now)
    if (h === 'fresh') continue
    if (h === 'thirsty') thirsty++
    else wilting++
    const cards = Object.values(s.skills).filter((c) => c.reps > 0)
    dry.push({ id: e.id, r: Math.min(...cards.map((c) => scheduler.retrievability(c, now))) })
  }
  return { byStage, seeds, thirsty, wilting, toWater: dry.sort((a, b) => a.r - b.r).map((d) => d.id) }
}
