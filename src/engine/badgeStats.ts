import { localDate } from './progress'
import type { ExerciseType, ReviewEvent } from './types'

/** Typed answers: producing the word or sentence, not choosing it. */
const TYPED: ExerciseType[] = ['typed_translation', 'cloze_typed', 'word_form', 'dictation', 'listen_type', 'back_translation', 'idiom_complete']
const LISTENING: ExerciseType[] = ['listen_choose', 'listen_type', 'dictation']
const TYPED_SET = new Set<string>(TYPED)
const LISTENING_SET = new Set<string>(LISTENING)

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
  /**
   * Words saved from forgetting: answered right when their recall chance had fallen below 70%.
   * This is what spaced repetition is for, so it is the badge that rewards it.
   */
  rescued: number
}

const COMEBACK_GAP_DAYS = 7
/** Below this recall chance a word was about to be forgotten (the daily plan's FORGOTTEN_R). */
const RESCUE_R = 0.7
const FAST_MS = 2000

/** Badge counts that come straight from the answer history (real answers only; practice does not count). */
export function activityStats(events: readonly ReviewEvent[]): ActivityStats {
  const perDay = new Map<string, number>()
  const night = new Set<string>()
  const early = new Set<string>()
  const weekend = new Set<string>()
  let listeningCorrect = 0
  let typedCorrect = 0
  let speakCorrect = 0
  let articleCorrect = 0
  let conjugationCorrect = 0
  let fastCorrect = 0
  let rescued = 0

  for (const e of events) {
    if (e.mode !== 'normal') continue
    const day = localDate(e.timestamp)
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
    const h = e.timestamp.getHours()
    if (h >= 22 || h < 5) night.add(day)
    else if (h < 8) early.add(day)
    const dow = e.timestamp.getDay()
    if (dow === 0 || dow === 6) weekend.add(day)

    if (e.correct) {
      if (LISTENING_SET.has(e.exerciseType)) listeningCorrect++
      if (TYPED_SET.has(e.exerciseType)) typedCorrect++
      if (e.exerciseType === 'speak_word') speakCorrect++
      if (e.exerciseType === 'article_choice') articleCorrect++
      if (e.exerciseType === 'conjugation') conjugationCorrect++
      if (e.responseMs > 0 && e.responseMs < FAST_MS && e.hintsUsed === 0 && e.confidence !== 'unsure') fastCorrect++
      if (e.retrievabilityBefore > 0 && e.retrievabilityBefore < RESCUE_R) rescued++
    }
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
    listeningCorrect,
    typedCorrect,
    speakCorrect,
    articleCorrect,
    conjugationCorrect,
    fastCorrect,
    rescued,
  }
}
