import { describe, expect, it } from 'vitest'
import { activityStats } from '../badgeStats'
import type { ExerciseType, ReviewEvent } from '../types'

let n = 0
const ev = (at: string, over: Partial<ReviewEvent> = {}): ReviewEvent =>
  ({ id: `e${n++}`, entryId: 'x', language: 'fr', skill: 'recognition', exerciseType: 'mc_meaning', direction: 'target_to_native', verdict: 'correct', correct: true, rating: 3, responseMs: 3000, hintsUsed: 0, retrievabilityBefore: 0.9, stabilityAfter: 3, scheduledDays: 3, mode: 'normal', timestamp: new Date(at), ...over }) as ReviewEvent

describe('activity badge stats', () => {
  it('counts days, the busiest day and the kinds of days', () => {
    const s = activityStats([
      ev('2026-03-02T23:30:00'), // Monday night
      ev('2026-03-02T23:40:00'),
      ev('2026-03-03T06:10:00'), // Tuesday, early
      ev('2026-03-07T10:00:00'), // Saturday
      ev('2026-03-08T10:00:00'), // Sunday
    ])
    expect(s.daysStudied).toBe(4)
    expect(s.maxDayAnswers).toBe(2)
    expect(s.nightDays).toBe(1)
    expect(s.earlyDays).toBe(1)
    expect(s.weekendDays).toBe(2)
  })

  it('does not count practice, and an empty history is all zeros', () => {
    expect(activityStats([ev('2026-03-02T10:00:00', { mode: 'practice' })]).daysStudied).toBe(0)
    expect(activityStats([])).toMatchObject({ daysStudied: 0, maxDayAnswers: 0, comebacks: 0, fastCorrect: 0 })
  })

  it('counts a comeback after a week away, not after a short break', () => {
    expect(activityStats([ev('2026-03-01T10:00:00'), ev('2026-03-05T10:00:00')]).comebacks).toBe(0)
    expect(activityStats([ev('2026-03-01T10:00:00'), ev('2026-03-08T10:00:00'), ev('2026-03-30T10:00:00')]).comebacks).toBe(2)
  })

  it('counts right answers by kind', () => {
    const t = (exerciseType: ExerciseType, over: Partial<ReviewEvent> = {}) => ev('2026-03-02T10:00:00', { exerciseType, ...over })
    const s = activityStats([
      t('listen_choose'),
      t('dictation'),
      t('listen_type', { correct: false, verdict: 'wrong' }),
      t('typed_translation'),
      t('cloze_typed'),
      t('speak_word'),
      t('article_choice'),
      t('conjugation'),
    ])
    expect(s.listeningCorrect).toBe(2)
    expect(s.typedCorrect).toBe(3) // typed_translation, cloze_typed, dictation
    expect(s.speakCorrect).toBe(1)
    expect(s.articleCorrect).toBe(1)
    expect(s.conjugationCorrect).toBe(1)
  })

  it('a fast right answer is not a guess or a hinted one', () => {
    const s = activityStats([
      ev('2026-03-02T10:00:00', { responseMs: 1200 }),
      ev('2026-03-02T10:01:00', { responseMs: 1200, hintsUsed: 1 }),
      ev('2026-03-02T10:02:00', { responseMs: 1200, confidence: 'unsure' }),
      ev('2026-03-02T10:03:00', { responseMs: 1200, correct: false, verdict: 'wrong' }),
      ev('2026-03-02T10:04:00', { responseMs: 5000 }),
    ])
    expect(s.fastCorrect).toBe(1)
  })
})
