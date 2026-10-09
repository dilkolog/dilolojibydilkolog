import { describe, expect, it } from 'vitest'
import { achievements, emptyStats, mergeBadgeLogs } from '../gamification'

describe('badge log', () => {
  it('a badge earned stays earned, with its date, even when its number falls', () => {
    const none = achievements({ ...emptyStats, wordsIntroduced: 0 })
    expect(none.find((a) => a.id === 'first-word')!.unlocked).toBe(false)
    const kept = achievements({ ...emptyStats, wordsIntroduced: 0 }, { 'first-word': '2026-10-08T10:00:00.000Z' })
    expect(kept.find((a) => a.id === 'first-word')).toMatchObject({ unlocked: true, unlockedAt: '2026-10-08T10:00:00.000Z', value: 1 })
    // Earned by its number but not logged yet: unlocked, no date (the watcher logs it).
    const fresh = achievements({ ...emptyStats, wordsIntroduced: 1 })
    expect(fresh.find((a) => a.id === 'first-word')).toMatchObject({ unlocked: true })
    expect(fresh.find((a) => a.id === 'first-word')!.unlockedAt).toBeUndefined()
  })

  it('two logs merge to every badge at its earlier known date', () => {
    expect(
      mergeBadgeLogs({ a: '2026-10-05T00:00:00Z', b: '', c: '2026-10-09T00:00:00Z' }, { a: '2026-10-07T00:00:00Z', b: '2026-10-01T00:00:00Z', d: '' }),
    ).toEqual({ a: '2026-10-05T00:00:00Z', b: '2026-10-01T00:00:00Z', c: '2026-10-09T00:00:00Z', d: '' })
    expect(mergeBadgeLogs(undefined, undefined)).toEqual({})
  })
})

describe('learning badges', () => {
  it('counts words saved from forgetting: right answers with the recall chance under 70%, not first meetings', async () => {
    const { activityStats } = await import('../badgeStats')
    const at = new Date('2026-10-08T10:00:00')
    const ev = (r: number, correct = true, mode: 'normal' | 'practice' = 'normal') =>
      ({ id: String(Math.random()), entryId: 'x', language: 'fr', skill: 'recall', exerciseType: 'typed_translation', direction: 'native_to_target', verdict: correct ? 'correct' : 'wrong', correct, rating: 3, responseMs: 3000, hintsUsed: 0, retrievabilityBefore: r, stabilityAfter: 1, scheduledDays: 1, mode, timestamp: at }) as never
    expect(activityStats([ev(0.5), ev(0.69), ev(0.9), ev(0), ev(0.4, false), ev(0.3, true, 'practice')]).rescued).toBe(2)
  })

  it('a whole verb is all its core tenses at full points; a round day counts once', async () => {
    const { emptyLab, labKey, wholeVerbs, recordTourDay, MASTERY_MAX } = await import('../labProgress')
    const card = {} as never
    const full = { ok: 6, wrong: 0, points: MASTERY_MAX, card }
    const lab = { ...emptyLab(), records: { [labKey('parler', 'present')]: full, [labKey('parler', 'futur')]: full, [labKey('aller', 'present')]: full } }
    expect(wholeVerbs(lab, ['present', 'futur'])).toBe(1)
    const twice = recordTourDay(recordTourDay(emptyLab(), '2026-10-08'), '2026-10-08')
    expect(twice.tourDays).toEqual(['2026-10-08'])
  })
})
