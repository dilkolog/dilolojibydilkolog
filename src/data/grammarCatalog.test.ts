import { describe, expect, it } from 'vitest'
import { CATALOG_LEVELS, grammarCatalog, grammarSearchKey } from './grammarCatalog'
import { grammarExercises } from './grammar'
import { topicName } from '../engine/grammar'

describe('the grammar topic directory', () => {
  for (const language of ['fr', 'es'] as const) {
    it(`${language}: gives every existing exercise exactly one home without changing its topic key`, () => {
      const categories = grammarCatalog(language)
      const topics = categories.flatMap((c) => c.topics)
      expect(new Set(categories.map((c) => c.id)).size).toBe(categories.length)
      expect(new Set(topics.map((t) => t.id)).size).toBe(topics.length)
      for (const e of grammarExercises(language)) expect(topics.filter((t) => t.id === e.topic), e.id).toHaveLength(1)
      for (const t of topics) {
        expect(CATALOG_LEVELS).toContain(t.level)
        expect(t.title.trim()).toBeTruthy()
        expect(t.description.trim()).toBeTruthy()
        expect(topicName(t.id)).not.toBe(t.id)
      }
      expect(new Set(topics.map((t) => t.level)).size).toBe(CATALOG_LEVELS.length)
    })
  }
  it('allows searching with omitted accents and Turkish casing', () => {
    expect(grammarSearchKey('İYELİK SIFATLARI')).toBe(grammarSearchKey('iyelik sıfatları'))
    expect(grammarSearchKey('Pretérito')).toBe('preterito')
    expect(grammarSearchKey('Être')).toBe('etre')
  })
})
