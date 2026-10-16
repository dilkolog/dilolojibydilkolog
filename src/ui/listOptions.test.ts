import { describe, expect, it } from 'vitest'
import type { WordList } from '../engine/types'
import { parsePlacement, placementOptions, placementValue, progressLine } from './listOptions'

describe('listOptions', () => {
  const sampleLists: WordList[] = [
    {
      id: 'travel',
      name: 'Seyahat',
      language: 'en',
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      levels: [
        { id: 'airport', name: 'Havalimanı' },
        { id: 'hotel', name: 'Otel' },
      ],
    },
    {
      id: 'basic',
      name: 'Temel',
      language: 'en',
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
    },
  ]

  describe('placementOptions', () => {
    it('creates flat options for lists and nested levels with a trailing none option', () => {
      const opts = placementOptions(sampleLists)
      expect(opts).toEqual([
        { value: 'travel', label: 'Seyahat' },
        { value: 'travel|airport', label: 'Seyahat › Havalimanı' },
        { value: 'travel|hotel', label: 'Seyahat › Otel' },
        { value: 'basic', label: 'Temel' },
        { value: '__none', label: 'Listesiz' },
      ])
    })

    it('respects custom label for none option', () => {
      const opts = placementOptions([], 'Yok')
      expect(opts).toEqual([{ value: '__none', label: 'Yok' }])
    })
  })

  describe('placementValue', () => {
    it('returns __none when entry has no valid listId in lists', () => {
      expect(placementValue({ listId: undefined, levelId: undefined }, sampleLists)).toBe('__none')
      expect(placementValue({ listId: 'unknown', levelId: undefined }, sampleLists)).toBe('__none')
    })

    it('returns listId when levelId is not present or not found in list.levels', () => {
      expect(placementValue({ listId: 'basic', levelId: undefined }, sampleLists)).toBe('basic')
      expect(placementValue({ listId: 'travel', levelId: 'nonexistent' }, sampleLists)).toBe('travel')
    })

    it('returns compound listId|levelId when level matches', () => {
      expect(placementValue({ listId: 'travel', levelId: 'airport' }, sampleLists)).toBe('travel|airport')
    })
  })

  describe('parsePlacement', () => {
    it('handles empty or __none string', () => {
      expect(parsePlacement('')).toEqual({ listId: null, levelId: null })
      expect(parsePlacement('__none')).toEqual({ listId: null, levelId: null })
    })

    it('parses list only string', () => {
      expect(parsePlacement('basic')).toEqual({ listId: 'basic', levelId: null })
    })

    it('parses composite list and level string', () => {
      expect(parsePlacement('travel|airport')).toEqual({ listId: 'travel', levelId: 'airport' })
    })
  })

  describe('progressLine', () => {
    it('formats group progress numbers into readable Turkish summary', () => {
      const p = { total: 50, met: 20, learned: 10 }
      expect(progressLine(p)).toBe('50 kelime · 20 tanıştı · 10 öğrenildi')
    })
  })
})
