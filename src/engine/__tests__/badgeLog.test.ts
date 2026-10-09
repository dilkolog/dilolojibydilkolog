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
