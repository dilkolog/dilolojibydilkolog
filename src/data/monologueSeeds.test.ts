import { describe, expect, it } from 'vitest'
import { MONOLOGUE_SEEDS, dailyMonologueSeed } from './monologueSeeds'

describe('monologueSeeds', () => {
  it('contains comprehensive seeds for all target languages', () => {
    for (const lang of ['fr', 'es', 'en'] as const) {
      const items = MONOLOGUE_SEEDS.filter((s) => s.language === lang)
      expect(items.length).toBeGreaterThanOrEqual(7)
      for (const item of items) {
        expect(item.prompt).toBeTruthy()
        expect(item.translation).toBeTruthy()
        expect(item.category).toBeTruthy()
      }
    }
  })

  it('deterministically returns daily seeds', () => {
    const d1 = new Date('2026-10-19T10:00:00Z')
    const d2 = new Date('2026-10-19T22:00:00Z')
    const d3 = new Date('2026-10-20T10:00:00Z')

    const s1 = dailyMonologueSeed('fr', d1)
    const s2 = dailyMonologueSeed('fr', d2)
    const s3 = dailyMonologueSeed('fr', d3)

    expect(s1.id).toBe(s2.id)
    expect(s1.prompt).toBe(s2.prompt)
    expect(s1.id).not.toBe(s3.id)
  })
})
