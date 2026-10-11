import { State } from 'ts-fsrs'
import { EXERCISES, exerciseTypesFor } from './exercises'
import { LESS_WEIGHT } from './exercisePrefs'
import { pick, type Rng } from './rng'
import type { Scheduler } from './scheduler'
import type { EngineOptions, ErrorType, ExerciseType, Skill, UserWordState, VocabularyEntry } from './types'

/**
 * Progressive disclosure: recognition, then recall; the rest (article, listening, patterns,
 * production) once recall holds, so a new word isn't tested in every format before it is known.
 */
export function unlockedSkills(state: UserWordState | undefined, entry: VocabularyEntry, opts: EngineOptions = {}): Skill[] {
  const out: Skill[] = ['recognition']
  if (!state) return out
  const { recognition, recall } = state.skills
  // Recall (typing the word from its meaning) right after the first recognition: what is only
  // recognised feels known but doesn't come to mind when needed.
  if (recognition && recognition.reps > 0 && exerciseTypesFor('recall', entry, opts).length) out.push('recall')
  // The other skills wait until the word can be recalled, so a new word's first days go to
  // getting it into memory rather than to six separate schedules (fewer, deeper cards).
  const recalledOnce = !!recall && recall.reps > 0 && recall.stability >= 1
  const recallHeld = recall?.state === State.Review
  if (recalledOnce && exerciseTypesFor('gender', entry, opts).length) out.push('gender')
  if (recallHeld && exerciseTypesFor('listening', entry, opts).length) out.push('listening')
  if (recallHeld && exerciseTypesFor('collocation', entry, opts).length) out.push('collocation')
  if (recallHeld && exerciseTypesFor('production', entry, opts).length) out.push('production')
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
  false_friend: 'recognition',
  cross_language: 'recall',
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
  // A phrase or a term of several words: its meaning is easy to pick among four by elimination,
  // so it is recognised in a sentence instead (its own example) whenever there is one.
  const multiword = entry.partOfSpeech === 'phrase' || entry.lemma.trim().includes(' ')
  const inContext = skill === 'recognition' && multiword ? types.filter((t) => EXERCISES[t].direction === 'context') : []
  const pool = inContext.length ? inContext : types
  const fresh = pool.filter((t) => t !== state?.lastExerciseType)
  const from = fresh.length ? fresh : pool
  // A type the learner wants less of stays in the pool with a smaller share.
  if (opts.less?.length && from.some((t) => opts.less!.includes(t))) {
    const weight = (t: ExerciseType) => (opts.less!.includes(t) ? LESS_WEIGHT : 1)
    let at = rng() * from.reduce((n, t) => n + weight(t), 0)
    for (const t of from) if ((at -= weight(t)) < 0) return t
  }
  return pick(from, rng)
}

