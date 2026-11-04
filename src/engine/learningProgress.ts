import { EXERCISES } from './exercises'
import type { AttemptInput } from './review'
import { SKILLS } from './types'
import type { LearningEvidence, Skill, UserWordState } from './types'

/** A guess, a spelling correction or a revealed answer is useful practice, not independent recall. */
export function independentAnswer(input: Pick<AttemptInput, 'verdict' | 'hintsUsed' | 'confidence'>): boolean {
  return input.verdict === 'correct' && input.hintsUsed === 0 && input.confidence !== 'unsure'
}

/** Keep zero-remaining evidence too: it is the tombstone that clears a debt when devices merge. */
export function learningEvidence(state: UserWordState, input: AttemptInput): UserWordState['learning'] {
  if (input.mode === 'practice' && !input.guided) return state.learning
  const skill = EXERCISES[input.exerciseType].skill
  if (!input.guided && !state.learning && independentAnswer(input)) return state.learning
  const before = state.learning?.[skill]
  const independent = independentAnswer(input)
  const now = input.at.getTime()
  const delayed = independent && EXERCISES[input.exerciseType].input === 'typed' && now - new Date(state.introducedAt).getTime() >= 86_400_000 && (!before?.lastFailureAt || now - Date.parse(before.lastFailureAt) >= 86_400_000)
  return {
    ...state.learning,
    ...((input.guided || state.learning) && input.recallExpected && skill === 'recognition' && !state.skills.recall && !state.learning?.recall ? { recall: { remaining: 1, at: input.at.toISOString(), delayed: false } } : {}),
    [skill]: {
      remaining: independent ? Math.max(0, (before?.remaining ?? 0) - 1) : 2,
      at: input.at.toISOString(),
      sequence: (before?.sequence ?? 0) + 1,
      delayed: independent ? (before?.delayed || delayed) : false,
      ...(independent ? (before?.lastFailureAt ? { lastFailureAt: before.lastFailureAt } : {}) : { lastFailureAt: input.at.toISOString() }),
    },
  }
}

export function learningDebts(state: UserWordState): Skill[] {
  return (Object.entries(state.learning ?? {}) as [Skill, LearningEvidence][]).filter(([, e]) => e.remaining > 0).map(([skill]) => skill).sort((a, b) => SKILLS.indexOf(a) - SKILLS.indexOf(b))
}

export function mergeLearning(a: UserWordState['learning'], b: UserWordState['learning']): UserWordState['learning'] {
  if (!a && !b) return undefined
  const out = { ...a }
  for (const [key, evidence] of Object.entries(b ?? {}) as [Skill, LearningEvidence][]) {
    const before = out[key]
    if (!before || evidence.at > before.at || (evidence.at === before.at && (evidence.sequence ?? 0) > (before.sequence ?? 0))) out[key] = evidence
    else if (evidence.at === before.at && (evidence.sequence ?? 0) === (before.sequence ?? 0)) {
      const lastFailureAt = [before.lastFailureAt, evidence.lastFailureAt].filter((s): s is string => !!s).sort().at(-1)
      out[key] = { ...before, remaining: Math.max(before.remaining, evidence.remaining), delayed: before.delayed && evidence.delayed, ...(lastFailureAt ? { lastFailureAt } : {}) }
    }
  }
  return out
}
