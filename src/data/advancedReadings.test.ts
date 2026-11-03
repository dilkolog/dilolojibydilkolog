import { describe, expect, it } from 'vitest'
import { advancedFor, ADVANCED_CATEGORY_LABELS, ADVANCED_READINGS } from './advancedReadings'
import { TARGET_LANGUAGES } from '../engine/types'

describe('advanced readings', () => {
  it('has B2 and C1 texts in every language, with unique ids of their language', () => {
    expect(new Set(ADVANCED_READINGS.map((r) => r.id)).size).toBe(ADVANCED_READINGS.length)
    for (const language of TARGET_LANGUAGES) {
      expect(advancedFor(language, 'B2').length, `${language} B2`).toBeGreaterThanOrEqual(3)
      expect(advancedFor(language, 'C1').length, `${language} C1`).toBeGreaterThanOrEqual(2)
      for (const r of advancedFor(language)) {
        expect(r.id.startsWith(`${language}-`), r.id).toBe(true)
        expect(r.language, r.id).toBe(language)
        expect(Object.keys(ADVANCED_CATEGORY_LABELS), r.id).toContain(r.category)
        expect(r.title.trim() && r.summary.trim(), r.id).toBeTruthy()
      }
    }
  })

  it('are about as long as a short reading: 150 to 320 words', () => {
    for (const r of ADVANCED_READINGS) {
      const words = r.text.split(/\s+/).filter(Boolean).length
      expect(words, `${r.id} (${words} words)`).toBeGreaterThanOrEqual(150)
      expect(words, `${r.id} (${words} words)`).toBeLessThanOrEqual(320)
    }
  })
})
