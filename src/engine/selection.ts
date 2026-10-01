import { State } from 'ts-fsrs'
import { EXERCISES, exerciseTypesFor } from './exercises'
import { pick, type Rng } from './rng'
import type { Scheduler } from './scheduler'
import type { ErrorType, ExerciseType, Skill, UserWordState, VocabularyEntry } from './types'

/**
 * Progressive disclosure: harder skills unlock only once the easier ones hold, so a new word
 * starts with recognition and isn't immediately tested on production.
 */
export function unlockedSkills(state: UserWordState | undefined, entry: VocabularyEntry): Skill[] {
  const out: Skill[] = ['recognition']
  if (!state) return out
  const { recognition, recall } = state.skills
  if (recognition && recognition.reps > 0) out.push('listening')
  if (recognition?.state === State.Review) out.push('recall')
  if (recall && recall.reps > 0 && exerciseTypesFor('collocation', entry).length) out.push('collocation')
  if (recall?.state === State.Review && exerciseTypesFor('production', entry).length) out.push('production')
  return out
}

export interface SkillDue {
  skill: Skill
  /** Current recall probability; 0 for a skill that has never been practised. */
  retrievability: number
}

/** Unlocked skills that are due (or never practised), weakest first. */
export function dueSkills(
  state: UserWordState | undefined,
  entry: VocabularyEntry,
  scheduler: Scheduler,
  now: Date,
): SkillDue[] {
  return unlockedSkills(state, entry)
    .map((skill) => {
      const card = state?.skills[skill]
      if (!card) return { skill, retrievability: 0, due: true }
      return { skill, retrievability: scheduler.retrievability(card, now), due: card.due <= now }
    })
    .filter((x) => x.due)
    .map(({ skill, retrievability }) => ({ skill, retrievability }))
    .sort((a, b) => a.retrievability - b.retrievability)
}

/** The skill a mistake type points to, so a mistake is practised where it was made. */
export const ERROR_SKILL: Record<ErrorType, Skill> = {
  meaning: 'recall',
  accent: 'recall',
  typo: 'recall',
  article: 'recall',
  gender: 'recall',
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
): ExerciseType {
  const types = exerciseTypesFor(skill, entry)
  if (!types.length) throw new Error(`no exercise for ${skill} on ${entry.id}`)
  const fresh = types.filter((t) => t !== state?.lastExerciseType)
  return pick(fresh.length ? fresh : types, rng)
}

export function skillOf(type: ExerciseType): Skill {
  return EXERCISES[type].skill
}
