import { describe, expect, it } from 'vitest'
import { FEATURE_NAME } from './usage'
import { AI_LEVELS, DEFAULT_AI_LEVEL, FEATURE_LEVEL, featuresOf, isAiFeature, isAiLevel, levelAllows } from './levels'

describe('AI levels', () => {
  it('every feature has a level, and only real features do', () => {
    expect(Object.keys(FEATURE_LEVEL).sort()).toEqual(Object.keys(FEATURE_NAME).sort())
  })

  it('a higher level may do everything a lower one may, and the closed level nothing', () => {
    for (let i = 1; i < AI_LEVELS.length - 1; i++) {
      for (const f of featuresOf(AI_LEVELS[i])) expect(levelAllows(AI_LEVELS[i + 1], f)).toBe(true)
    }
    expect(featuresOf('kapali')).toEqual([])
  })

  it('the default level keeps the free chat, the photo and the podcast shut', () => {
    expect(DEFAULT_AI_LEVEL).toBe('calisma')
    for (const f of ['monki', 'chat', 'photo_words', 'photo_text', 'podcast'] as const) expect(levelAllows(DEFAULT_AI_LEVEL, f)).toBe(false)
    expect(levelAllows(DEFAULT_AI_LEVEL, 'sentence')).toBe(true)
    expect(levelAllows('kelime', 'sentence')).toBe(false)
    expect(levelAllows('tam', 'monki')).toBe(true)
  })

  it('knows a level and a feature when it sees one', () => {
    expect(isAiLevel('tam')).toBe(true)
    expect(isAiLevel('admin')).toBe(false)
    expect(isAiFeature('monki')).toBe(true)
    expect(isAiFeature('constructor')).toBe(false)
    expect(isAiFeature(undefined)).toBe(false)
  })
})
