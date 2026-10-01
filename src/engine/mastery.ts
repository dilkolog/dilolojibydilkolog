import { State, type Card } from 'ts-fsrs'
import type { Scheduler } from './scheduler'
import { SKILLS, type Skill, type UserWordState } from './types'

export type MasteryStage =
  | 'introduced'
  | 'familiar'
  | 'recallable'
  | 'strong'
  | 'production_ready'
  | 'mastered'

export const MASTERY_STAGES: readonly MasteryStage[] = [
  'introduced',
  'familiar',
  'recallable',
  'strong',
  'production_ready',
  'mastered',
]

/**
 * Stage thresholds use FSRS stability (days until recall probability drops to 90%), which
 * measures how durable a memory is rather than how recently it was seen.
 */
export const STRONG_STABILITY_DAYS = 7
export const PRODUCTION_READY_STABILITY_DAYS = 3
export const MASTERED_STABILITY_DAYS = 21

const graduated = (c?: Card) => c !== undefined && c.state === State.Review
const stable = (c: Card | undefined, days: number) => graduated(c) && c!.stability >= days

/**
 * Stages require each skill in turn, so strong recognition alone never counts as mastery:
 * a word is only "mastered" once the user can also produce it reliably.
 */
export function masteryStage(state: UserWordState): MasteryStage {
  const { recognition, recall, production } = state.skills
  if (
    stable(recognition, MASTERED_STABILITY_DAYS) &&
    stable(recall, MASTERED_STABILITY_DAYS) &&
    stable(production, MASTERED_STABILITY_DAYS)
  )
    return 'mastered'
  if (stable(recall, STRONG_STABILITY_DAYS) && stable(production, PRODUCTION_READY_STABILITY_DAYS))
    return 'production_ready'
  if (stable(recognition, STRONG_STABILITY_DAYS) && stable(recall, STRONG_STABILITY_DAYS)) return 'strong'
  if (graduated(recall)) return 'recallable'
  if (graduated(recognition)) return 'familiar'
  return 'introduced'
}

/** 0–100 per skill: current probability of recall. Untouched skills score 0. */
export function skillScores(state: UserWordState, scheduler: Scheduler, now: Date): Record<Skill, number> {
  const out = {} as Record<Skill, number>
  for (const s of SKILLS) {
    const card = state.skills[s]
    out[s] = card ? Math.round(scheduler.retrievability(card, now) * 100) : 0
  }
  return out
}

/**
 * Aggregate profile across words. A skill is averaged only over words where it is unlocked,
 * so a fresh word doesn't drag down e.g. the production score before production is taught.
 */
export function skillProfile(
  states: readonly UserWordState[],
  scheduler: Scheduler,
  now: Date,
): Record<Skill, number | null> {
  const out = {} as Record<Skill, number | null>
  for (const s of SKILLS) {
    const cards = states.map((st) => st.skills[s]).filter((c): c is Card => !!c && c.reps > 0)
    out[s] = cards.length
      ? Math.round((cards.reduce((sum, c) => sum + scheduler.retrievability(c, now), 0) / cards.length) * 100)
      : null
  }
  return out
}
