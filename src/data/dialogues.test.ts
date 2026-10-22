import { describe, expect, it } from 'vitest'
import { dialogues } from './dialogues'

describe('the dialogues', () => {
  it('are there in every language, with unique ids of their language', () => {
    for (const language of ['fr', 'es', 'en'] as const) expect(dialogues.filter((d) => d.language === language).length, language).toBeGreaterThanOrEqual(8)
    expect(new Set(dialogues.map((d) => d.id)).size).toBe(dialogues.length)
    for (const d of dialogues) expect(d.id.startsWith(`${d.language}-`), d.id).toBe(true)
  })

  it('are well formed: 5–6 turns, three different options, one answer, every answer position used, Turkish everywhere', () => {
    for (const d of dialogues) {
      expect(['A1', 'A2', 'B1', 'B2'], d.id).toContain(d.level)
      expect(d.title.length && d.scene.length, d.id).toBeTruthy()
      expect(d.turns.length, d.id).toBeGreaterThanOrEqual(5)
      expect(d.turns.length, d.id).toBeLessThanOrEqual(6)
      expect(new Set(d.turns.map((t) => t.answer)).size, d.id).toBeGreaterThanOrEqual(2)
      for (const t of d.turns) {
        const where = `${d.id}: ${t.say}`
        expect(t.options, where).toHaveLength(3)
        expect(new Set(t.options.map((o) => o.trim().toLowerCase())).size, where).toBe(3)
        expect([0, 1, 2], where).toContain(t.answer)
        for (const text of [t.say, t.tr, t.why, t.replyTr, ...t.options]) expect(text.trim().length, where).toBeGreaterThan(1)
      }
    }
  })
})
