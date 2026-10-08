import { describe, expect, it } from 'vitest'
import { CLASSIC_READINGS, classicsFor, findClassic, type ClassicCategory } from './classicReadings'
import { TARGET_LANGUAGES } from '../engine/types'

describe('classicReadings', () => {
  it('covers all target languages with multiple readings', () => {
    for (const lang of TARGET_LANGUAGES) {
      const list = classicsFor(lang)
      expect(list.length).toBeGreaterThanOrEqual(7)
      for (const item of list) {
        expect(item.language).toBe(lang)
        expect(item.title.trim().length).toBeGreaterThan(0)
        expect(item.author.trim().length).toBeGreaterThan(0)
        expect(item.summary.trim().length).toBeGreaterThan(0)
        expect(item.text.trim().length).toBeGreaterThan(50)
        expect(['A1-A2', 'A2-B1', 'B1-B2']).toContain(item.level)
      }
    }
  })

  it('has unique IDs for every reading', () => {
    const ids = new Set<string>()
    for (const item of CLASSIC_READINGS) {
      expect(ids.has(item.id)).toBe(false)
      ids.add(item.id)
    }
  })

  it('filters by category correctly', () => {
    const categories: ClassicCategory[] = ['fable', 'fairy-tale', 'story']
    for (const cat of categories) {
      const enFiltered = classicsFor('en', cat)
      for (const item of enFiltered) {
        expect(item.category).toBe(cat)
      }
    }
  })

  it('finds items by id', () => {
    const hare = findClassic('classic-en-tortoise-hare')
    expect(hare).toBeDefined()
    expect(hare?.title).toBe('The Tortoise and the Hare')
    expect(hare?.author).toBe('Aesop')

    const lievre = findClassic('classic-fr-lievre-tortue')
    expect(lievre).toBeDefined()
    expect(lievre?.title).toBe('Le Lièvre et la Tortue')
    expect(lievre?.author).toBe('Jean de La Fontaine')

    const lechera = findClassic('classic-es-lechera')
    expect(lechera).toBeDefined()
    expect(lechera?.title).toBe('La lechera')
    expect(lechera?.author).toBe('Félix María de Samaniego')

    const unknown = findClassic('non-existent-id')
    expect(unknown).toBeUndefined()
  })
})
