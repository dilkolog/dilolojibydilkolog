/**
 * When the Progress and Profile screens have something to say, in one place. A learner with no answers yet sees one
 * invitation instead of rows of zeros; the weekly rhythm (and the rest of Progress) comes with the first answers of a
 * round; the skills and the kinds of mistakes once there are enough answers for them to mean something.
 */
export const UNLOCK_ANSWERS = {
  /** The first answers: the week's rhythm, the overview, the reviews, the study pattern. */
  rhythm: 1,
  /** Skills and the kinds of mistakes: a skill's percentage over a handful of answers would mislead. */
  skills: 30,
} as const

export interface ProgressUnlocks {
  /** No answers at all: the screen is an invitation to the first round. */
  empty: boolean
  rhythm: boolean
  skills: boolean
  /** Answers still to give before the skills open (0 once they are open). */
  skillsLeft: number
}

export function progressUnlocks(answers: number): ProgressUnlocks {
  const n = Math.max(0, Math.floor(answers) || 0)
  return {
    empty: n < UNLOCK_ANSWERS.rhythm,
    rhythm: n >= UNLOCK_ANSWERS.rhythm,
    skills: n >= UNLOCK_ANSWERS.skills,
    skillsLeft: Math.max(0, UNLOCK_ANSWERS.skills - n),
  }
}
