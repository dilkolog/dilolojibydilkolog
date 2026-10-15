import { describe, expect, it } from 'vitest'
import { dailyQuests, dayMetrics, questBonus, questStatus } from '../quests'
import type { ReviewEvent } from '../types'

describe('dailyQuests', () => {
  it('returns exactly three quests for any date string', () => {
    const quests = dailyQuests('2026-10-15')
    expect(quests).toHaveLength(3)
    for (const q of quests) {
      expect(q.def.targets).toContain(q.target)
      expect(q.def.xp).toBeGreaterThan(0)
    }
  })

  it('is completely deterministic for the same date', () => {
    const q1 = dailyQuests('2026-10-16')
    const q2 = dailyQuests('2026-10-16')
    expect(q1).toEqual(q2)
  })
})

describe('dayMetrics', () => {
  const baseEvent: ReviewEvent = {
    id: 'e1',
    entryId: 'en:decision',
    language: 'en',
    skill: 'recognition',
    exerciseType: 'mc_meaning',
    direction: 'target_to_native',
    verdict: 'correct',
    correct: true,
    rating: 3 as const,
    responseMs: 1200,
    hintsUsed: 0,
    retrievabilityBefore: 0.8,
    stabilityAfter: 3,
    scheduledDays: 3,
    mode: 'normal',
    timestamp: new Date('2026-10-15T10:00:00Z'),
  }

  it('aggregates normal mode reviews accurately', () => {
    const t0 = new Date('2026-10-15T10:00:00Z')
    const events: ReviewEvent[] = [
      // 1. Correct mc_meaning, 0 hints
      { ...baseEvent, id: 'e1', timestamp: new Date(t0.getTime()) },
      // 2. Correct typed_translation (typed input), 0 hints
      { ...baseEvent, id: 'e2', exerciseType: 'typed_translation', skill: 'recall', timestamp: new Date(t0.getTime() + 1000) },
      // 3. Wrong answer (breaks combo)
      { ...baseEvent, id: 'e3', verdict: 'wrong', correct: false, timestamp: new Date(t0.getTime() + 2000) },
      // 4. Correct listening question with 1 hint
      { ...baseEvent, id: 'e4', skill: 'listening', exerciseType: 'listen_choose', hintsUsed: 1, timestamp: new Date(t0.getTime() + 3000) },
      // 5. Practice mode event (must be ignored)
      { ...baseEvent, id: 'e5', mode: 'practice', timestamp: new Date(t0.getTime() + 4000) },
    ]

    const metrics = dayMetrics(events, 4)

    expect(metrics.answers).toBe(4) // 4 normal events
    expect(metrics.correct).toBe(3)
    expect(metrics.combo).toBe(2) // e1 and e2 in a row
    expect(metrics.typedCorrect).toBe(1) // e2
    expect(metrics.listenCorrect).toBe(1) // e4
    expect(metrics.noHintCorrect).toBe(2) // e1 and e2
    expect(metrics.newWords).toBe(4)
  })
})

describe('questStatus and questBonus', () => {
  const t0 = new Date('2026-10-15T12:00:00')
  const makeEvent = (i: number, correct = true): ReviewEvent => ({
    id: `ev-${i}`,
    entryId: `en:word-${i}`,
    language: 'en',
    skill: 'recognition',
    exerciseType: 'mc_meaning',
    direction: 'target_to_native',
    verdict: correct ? 'correct' : 'wrong',
    correct,
    rating: (correct ? 3 : 1) as never,
    responseMs: 1000,
    hintsUsed: 0,
    retrievabilityBefore: 0.5,
    stabilityAfter: 2,
    scheduledDays: 2,
    mode: 'normal',
    timestamp: new Date(t0.getTime() + i * 1000),
  })

  it('evaluates status and marks done when target is met', () => {
    const date = '2026-10-15'
    const quests = dailyQuests(date)
    const metrics = {
      answers: 100,
      correct: 100,
      combo: 50,
      typedCorrect: 50,
      listenCorrect: 50,
      newWords: 50,
      noHintCorrect: 50,
    }

    const statuses = questStatus(date, metrics)
    expect(statuses).toHaveLength(3)
    for (let i = 0; i < 3; i++) {
      expect(statuses[i].id).toBe(quests[i].def.id)
      expect(statuses[i].done).toBe(true)
      expect(statuses[i].value).toBe(statuses[i].target)
    }
  })

  it('calculates bonus XP correctly for days with finished quests', () => {
    // Generate 60 correct answers with 0 hints on 2026-10-15
    const events = Array.from({ length: 60 }, (_, i) => makeEvent(i, true))
    const intros = [t0, t0, t0, t0, t0] // 5 introductions

    const bonus = questBonus(events, intros)
    const dayKey = '2026-10-15'
    const xp = bonus.get(dayKey)
    expect(xp).toBeDefined()
    expect(xp!).toBeGreaterThan(0)
  })
})
