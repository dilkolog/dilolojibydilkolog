import { State } from 'ts-fsrs'
import { EXERCISES, exerciseTypesFor } from './exercises'
import { pick, type Rng } from './rng'
import type { Scheduler } from './scheduler'
import type { EngineOptions, ErrorType, ExerciseType, Skill, UserWordState, VocabularyEntry } from './types'

/**
 * Progressive disclosure: harder skills unlock only once the easier ones hold, so a new word
 * starts with recognition and isn't immediately tested on production.
 */
export function unlockedSkills(state: UserWordState | undefined, entry: VocabularyEntry, opts: EngineOptions = {}): Skill[] {
  const out: Skill[] = ['recognition']
  if (!state) return out
  const { recognition, recall } = state.skills
  if (recognition && recognition.reps > 0) out.push('listening')
  if (recognition && recognition.reps > 0 && exerciseTypesFor('gender', entry).length) out.push('gender')
  if (recognition?.state === State.Review) out.push('recall')
  if (recall && recall.reps > 0 && exerciseTypesFor('collocation', entry).length) out.push('collocation')
  if (recall?.state === State.Review && exerciseTypesFor('production', entry, opts).length) out.push('production')
  return out
}

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const SKILL_PRIORITY: Record<Skill, number> = { recognition: 0, recall: 1, gender: 2, listening: 3, collocation: 4, production: 5 }

export interface SkillDue {
  skill: Skill
  /** Current recall probability; 0 for a skill that has never been practised. */
  retrievability: number
}

/**
 * Unlocked skills that are due, weakest first. A newly unlocked skill becomes due the day after
 * the word was last practised, so a word isn't drilled in every format on the day it's learned.
 */
export function dueSkills(
  state: UserWordState | undefined,
  entry: VocabularyEntry,
  scheduler: Scheduler,
  now: Date,
  opts: EngineOptions = {},
): SkillDue[] {
  return unlockedSkills(state, entry, opts)
    .map((skill) => {
      const card = state?.skills[skill]
      if (!card) return { skill, retrievability: 0, due: !state?.lastReviewAt || state.lastReviewAt < startOfDay(now) }
      return { skill, retrievability: scheduler.retrievability(card, now), due: card.due <= now }
    })
    .filter((x) => x.due)
    .map(({ skill, retrievability }) => ({ skill, retrievability }))
    // Ties (e.g. two never-practised skills) go to the more fundamental skill first.
    .sort((a, b) => a.retrievability - b.retrievability || SKILL_PRIORITY[a.skill] - SKILL_PRIORITY[b.skill])
}

/** The skill a mistake type points to, so a mistake is practised where it was made. */
export const ERROR_SKILL: Record<ErrorType, Skill> = {
  meaning: 'recall',
  accent: 'recall',
  typo: 'recall',
  article: 'recall',
  gender: 'gender',
  form: 'production',
  confusion: 'recognition',
  collocation: 'collocation',
}

/**
 * Picks an exercise for the skill, avoiding the format the word was last seen in so the same
 * word never comes back as the same card.
 */
export function pickExerciseType(
  skill: Skill,
  entry: VocabularyEntry,
  state: UserWordState | undefined,
  rng: Rng,
  opts: EngineOptions = {},
): ExerciseType {
  const types = exerciseTypesFor(skill, entry, opts)
  if (!types.length) throw new Error(`no exercise for ${skill} on ${entry.id}`)
  const fresh = types.filter((t) => t !== state?.lastExerciseType)
  return pick(fresh.length ? fresh : types, rng)
}

export function skillOf(type: ExerciseType): Skill {
  return EXERCISES[type].skill
}
