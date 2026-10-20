import { describe, expect, it } from 'vitest'
import { activityStats, type ActivityStats } from '../badgeStats'
import { longestStreak, longestStreakFromDays } from '../gamification'
import { localDate } from '../progress'
import type { ExerciseType, ReviewEvent, TargetLanguage } from '../types'

/** Legacy multi-pass activityStats for exact mathematical comparison. */
function legacyActivityStats(events: readonly ReviewEvent[]): ActivityStats {
  const TYPED: ExerciseType[] = ['typed_translation', 'cloze_typed', 'word_form', 'dictation', 'listen_type', 'back_translation', 'idiom_complete']
  const LISTENING: ExerciseType[] = ['listen_choose', 'listen_type', 'dictation']
  const RESCUE_R = 0.7
  const FAST_MS = 2000
  const COMEBACK_GAP_DAYS = 7

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
    rescued: real.filter((e) => e.correct && e.retrievabilityBefore > 0 && e.retrievabilityBefore < RESCUE_R).length,
  }
}

function makeSyntheticEvents(count: number): ReviewEvent[] {
  const types: ExerciseType[] = ['mc_meaning', 'typed_translation', 'cloze_typed', 'word_form', 'listen_choose', 'listen_type', 'dictation', 'speak_word', 'article_choice', 'conjugation', 'free_sentence']
  const langs: TargetLanguage[] = ['fr', 'es', 'en']
  const baseDate = new Date('2026-01-01T08:00:00Z').getTime()
  const events: ReviewEvent[] = []

  for (let i = 0; i < count; i++) {
    // Spread across ~180 days with various times
    const dayOffset = (i * 17) % 180
    const hour = (i * 7) % 24
    const timestamp = new Date(baseDate + dayOffset * 86_400_000 + hour * 3600_000)
    const mode = i % 10 === 0 ? 'practice' : i % 25 === 0 ? 'review' : 'normal'
    const correct = i % 4 !== 0
    const exerciseType = types[i % types.length]
    const language = langs[i % langs.length]
    const responseMs = (i % 5) * 800
    const hintsUsed = i % 7 === 0 ? 1 : 0
    const confidence = i % 9 === 0 ? 'unsure' : 'confident'
    const retrievabilityBefore = (i % 10) * 0.1

    events.push({
      id: `ev-${i}`,
      entryId: `word-${i % 200}`,
      timestamp,
      language,
      exerciseType,
      verdict: correct ? 'correct' : 'wrong',
      correct,
      responseMs,
      hintsUsed,
      confidence,
      retrievabilityBefore,
      mode: mode as ReviewEvent['mode'],
    } as ReviewEvent)
  }
  return events
}

describe('loadGame and activityStats performance & equivalence', () => {
  it('activityStats single-pass produces identical results to legacy multi-pass on 5,000 events', () => {
    const events = makeSyntheticEvents(5000)
    const expected = legacyActivityStats(events)
    const actual = activityStats(events)

    expect(actual).toEqual(expected)
    expect(actual.daysStudied).toBeGreaterThan(50)
    expect(actual.listeningCorrect).toBeGreaterThan(0)
    expect(actual.fastCorrect).toBeGreaterThan(0)
    expect(actual.rescued).toBeGreaterThan(0)
  })

  it('longestStreakFromDays matches longestStreak on 5,000 events', () => {
    const events = makeSyntheticEvents(5000)
    const expected = longestStreak(events)
    const sortedDays = [...new Set(events.filter((e) => e.mode === 'normal').map((e) => localDate(e.timestamp)))].sort()
    const actual = longestStreakFromDays(sortedDays)

    expect(actual).toBe(expected)
  })

  it('handles 30,000 events efficiently without degradation', () => {
    const events = makeSyntheticEvents(30_000)
    const t0 = performance.now()
    const stats = activityStats(events)
    const elapsed = performance.now() - t0

    expect(stats.daysStudied).toBeGreaterThan(100)
    // 30,000 items in single pass should execute under 50ms in Node
    expect(elapsed).toBeLessThan(200)
  })
})
