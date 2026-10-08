import { Rating } from 'ts-fsrs'
import { createScheduler } from './scheduler'

/**
 * How many reviews a day the new-word pace leads to (like FSRS's workload simulator in Anki).
 * A card learned on day 0 and recalled each time it falls due gives a review pattern; adding
 * `perDay` words every day stacks those patterns. Each word has a few skill cards over time.
 */
export interface WorkloadForecast {
  /** Expected reviews on the given day from now (new words only). */
  reviewsAt: (day: number) => number
  /** Rough minutes for those reviews. */
  minutesAt: (day: number) => number
}

/** Skill cards a word builds up to (recognition, recall, then listening/production/…). */
const CARDS_PER_WORD = 3
/** Seconds per review, answer and feedback included. */
const SECONDS_PER_REVIEW = 12

export function forecastWorkload(perDay: number, retention: number, weights?: readonly number[] | null, horizon = 60): WorkloadForecast {
  const s = createScheduler({ requestRetention: retention, weights: weights ?? undefined, fuzz: false })
  // One card's review days within the horizon, recalled Good every time (a lapse adds a little).
  const DAY = 86_400_000
  const t0 = new Date(2026, 0, 1, 9)
  const pattern = new Array<number>(horizon + 1).fill(0)
  let card = s.review(s.newCard(t0), Rating.Good, t0)
  for (let i = 0; i < 40; i++) {
    const day = Math.round((card.due.getTime() - t0.getTime()) / DAY)
    if (day > horizon) break
    pattern[day] += 1
    card = s.review(card, Rating.Good, card.due)
  }
  // Recall isn't perfect: about (1 − retention) of reviews are lapses that bring an extra one.
  const lapseExtra = 1 + (1 - retention)
  const reviewsAt = (day: number) => {
    let sum = 0
    for (let d = 1; d <= Math.min(day, horizon); d++) sum += pattern[d]
    return sum * perDay * CARDS_PER_WORD * lapseExtra
  }
  return { reviewsAt, minutesAt: (day) => (reviewsAt(day) * SECONDS_PER_REVIEW) / 60 }
}

/** Minutes a new word takes on its first day: introduction, first test and two follow-ups. */
export const NEW_WORD_MINUTES = 0.8

/**
 * The daily minutes a pace settles into after a month: the reviews it has built up plus the new
 * words themselves. Above the learner's daily minutes, new words would stop coming most days.
 */
export function monthlyMinutes(perDay: number, retention: number, weights?: readonly number[] | null): number {
  return forecastWorkload(perDay, retention, weights).minutesAt(30) + perDay * NEW_WORD_MINUTES
}

/** The largest of `options` that still fits `dailyMinutes` a month on (0 when none does). */
export function recommendedNewWords(options: readonly number[], dailyMinutes: number, retention: number, weights?: readonly number[] | null): number {
  return [...options].sort((a, b) => b - a).find((n) => monthlyMinutes(n, retention, weights) <= dailyMinutes) ?? 0
}
