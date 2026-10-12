import type { Scheduler } from './scheduler'
import { shuffle, type Rng } from './rng'
import type { CefrLevel, ExerciseType, UserWordState, VocabularyEntry } from './types'
import { CEFR_LEVELS } from './cefrLevels'

/**
 * Monthly retention exam: a surprise test on random learned words, no hints, regardless of what
 * is due. It measures how much is actually retained, independently of the scheduler, and
 * checks the scheduler's own predictions against reality.
 */

export const EXAM_SIZE = 20
/** Words met more recently than this aren't tested: the exam is about lasting memory. */
const MIN_AGE_DAYS = 3
export const EXAM_INTERVAL_DAYS = 28

export interface ExamItem {
  entryId: string
  type: Extract<ExerciseType, 'typed_translation' | 'mc_meaning'>
  /** Predicted recall probability for that skill just before the exam. */
  predicted: number
}

export function buildExam(vocabulary: readonly VocabularyEntry[], states: readonly UserWordState[], scheduler: Scheduler, now: Date, rng: Rng): ExamItem[] {
  const known = new Set(vocabulary.map((v) => v.id))
  const old = states.filter(
    (s) => known.has(s.entryId) && s.skills.recognition && s.skills.recognition.reps > 0 && now.getTime() - s.introducedAt.getTime() >= MIN_AGE_DAYS * 86_400_000,
  )
  return shuffle(old, rng)
    .slice(0, EXAM_SIZE)
    .map((s, i) => {
      // Alternate recall and recognition; recall only once the word has been recalled before.
      const recall = i % 2 === 0 && !!s.skills.recall
      const card = recall ? s.skills.recall! : s.skills.recognition!
      return { entryId: s.entryId, type: recall ? 'typed_translation' : 'mc_meaning', predicted: scheduler.retrievability(card, now) }
    })
}

export interface ExamResult {
  language: VocabularyEntry['language']
  /** ISO date. */
  at: string
  n: number
  recall: { n: number; right: number }
  recognition: { n: number; right: number }
  /** Mean predicted recall probability over the exam. */
  predicted: number
  /** Share answered right. */
  actual: number
  /** Right answers by CEFR band of the word (only bands with questions; absent where no list exists). */
  levels?: { level: CefrLevel; n: number; right: number }[]
  /** Words answered wrong, for a "work on these" list. */
  missed?: string[]
}

/** A rough level from which band the learner still remembers: the highest with ≥2 questions and ≥70% right. */
export function estimateLevel(levels: readonly { level: CefrLevel; n: number; right: number }[] | undefined): CefrLevel | undefined {
  if (!levels || levels.reduce((s, l) => s + l.n, 0) < 6) return undefined
  const ok = levels.filter((l) => l.n >= 2 && l.right / l.n >= 0.7).map((l) => CEFR_LEVELS.indexOf(l.level))
  return ok.length ? CEFR_LEVELS[Math.max(...ok)] : undefined
}

/** The band with the weakest recall (≥2 questions, below 60% right), if any. */
export function weakestLevel(levels: readonly { level: CefrLevel; n: number; right: number }[] | undefined): CefrLevel | undefined {
  const weak = (levels ?? []).filter((l) => l.n >= 2 && l.right / l.n < 0.6).sort((a, b) => a.right / a.n - b.right / b.n)
  return weak[0]?.level
}

export function scoreExam(language: VocabularyEntry['language'], items: readonly ExamItem[], right: readonly boolean[], now: Date, levelOf?: (entryId: string) => CefrLevel | undefined): ExamResult {
  const part = (type: ExamItem['type']) => {
    const idx = items.map((it, i) => (it.type === type ? i : -1)).filter((i) => i >= 0)
    return { n: idx.length, right: idx.filter((i) => right[i]).length }
  }
  const n = items.length
  const bands = new Map<CefrLevel, { n: number; right: number }>()
  if (levelOf) {
    items.forEach((it, i) => {
      const level = levelOf(it.entryId)
      if (!level) return
      const b = bands.get(level) ?? { n: 0, right: 0 }
      b.n++
      if (right[i]) b.right++
      bands.set(level, b)
    })
  }
  const missed = items.filter((_, i) => !right[i]).map((it) => it.entryId)
  return {
    language,
    at: now.toISOString(),
    n,
    recall: part('typed_translation'),
    recognition: part('mc_meaning'),
    predicted: n ? items.reduce((s, it) => s + it.predicted, 0) / n : 0,
    actual: n ? right.filter(Boolean).length / n : 0,
    ...(bands.size ? { levels: CEFR_LEVELS.filter((l) => bands.has(l)).map((level) => ({ level, ...bands.get(level)! })) } : {}),
    ...(missed.length ? { missed } : {}),
  }
}
