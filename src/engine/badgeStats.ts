import { localDate } from './progress'
import type { ExerciseType, ReviewEvent } from './types'

/** Typed answers: producing the word or sentence, not choosing it. */
const TYPED: ExerciseType[] = ['typed_translation', 'cloze_typed', 'word_form', 'dictation', 'listen_type', 'back_translation', 'idiom_complete']
const LISTENING: ExerciseType[] = ['listen_choose', 'listen_type', 'dictation']

export interface ActivityStats {
  /** Days with at least one real answer. */
  daysStudied: number
  /** Most real answers in a single day. */
  maxDayAnswers: number
  /** Days with an answer between 22:00 and 05:00 / between 05:00 and 08:00 / on a Saturday or Sunday. */
  nightDays: number
  earlyDays: number
  weekendDays: number
  /** Times the learner came back after a gap of a week or more. */
  comebacks: number
  listeningCorrect: number
  typedCorrect: number
  speakCorrect: number
  articleCorrect: number
  conjugationCorrect: number
  /** Right answers given in under two seconds, to a question that is not a guess. */
  fastCorrect: number
}

const COMEBACK_GAP_DAYS = 7
const FAST_MS = 2000

/** Badge counts that come straight from the answer history (real answers only; practice does not count). */
export function activityStats(events: readonly ReviewEvent[]): ActivityStats {
  const real = events.filter((e) => e.mode === 'normal')
  const perDay = new Map<string, number>()
  const night = new Set<string>()
  const early = new Set<string>()
  const weekend = new Set<string>()
  const right = (e: ReviewEvent, types: readonly ExerciseType[]) => e.correct && types.includes(e.exerciseType)
  for (const e of real) {
    const day = localDate(e.timestamp)
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
    const h = e.timestamp.getHours()
    if (h >= 22 || h < 5) night.add(day)
    else if (h < 8) early.add(day)
    const dow = e.timestamp.getDay()
    if (dow === 0 || dow === 6) weekend.add(day)
  }
  const days = [...perDay.keys()].sort()
  let comebacks = 0
  for (let i = 1; i < days.length; i++) {
    const gap = Math.round((new Date(`${days[i]}T12:00:00`).getTime() - new Date(`${days[i - 1]}T12:00:00`).getTime()) / 86_400_000)
    if (gap >= COMEBACK_GAP_DAYS) comebacks++
  }
  return {
    daysStudied: days.length,
    maxDayAnswers: Math.max(0, ...perDay.values()),
    nightDays: night.size,
    earlyDays: early.size,
    weekendDays: weekend.size,
    comebacks,
    listeningCorrect: real.filter((e) => right(e, LISTENING)).length,
    typedCorrect: real.filter((e) => right(e, TYPED)).length,
    speakCorrect: real.filter((e) => right(e, ['speak_word'])).length,
    articleCorrect: real.filter((e) => right(e, ['article_choice'])).length,
    conjugationCorrect: real.filter((e) => right(e, ['conjugation'])).length,
    fastCorrect: real.filter((e) => e.correct && e.responseMs > 0 && e.responseMs < FAST_MS && e.hintsUsed === 0 && e.confidence !== 'unsure').length,
  }
}
