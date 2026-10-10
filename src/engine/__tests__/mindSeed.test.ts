import { describe, expect, it } from 'vitest'
import { MIND_SEEDS, seedIndex, seedText } from '../mindSeed'

describe('mind seeds', () => {
  it('all name the language once, and none are twice', () => {
    for (const s of MIND_SEEDS) expect(s.match(/\{dil\}/g)).toHaveLength(1)
    expect(new Set(MIND_SEEDS).size).toBe(MIND_SEEDS.length)
  })

  it('stays the same through a day and a language, changes from day to day, and skips to another', () => {
    expect(seedIndex('2026-10-10', 'fr')).toBe(seedIndex('2026-10-10', 'fr'))
    const days = new Set(Array.from({ length: 20 }, (_, i) => seedIndex(`2026-10-${String(i + 1).padStart(2, '0')}`, 'fr')))
    expect(days.size).toBe(20)
    expect(seedIndex('2026-10-10', 'fr', 1)).not.toBe(seedIndex('2026-10-10', 'fr'))
  })

  it('writes the language in Turkish into the sentence, and a skip wraps around', () => {
    expect(seedText(1, 'fr')).toBe('Yarın yapacağın ilk üç işi Fransızca sırala.')
    expect(seedText(1, 'es')).toContain('İspanyolca')
    expect(seedText(MIND_SEEDS.length + 1, 'en')).toContain('İngilizce')
    expect(seedIndex('2026-10-10', 'en', MIND_SEEDS.length - 1)).toBeLessThan(MIND_SEEDS.length)
  })
})
