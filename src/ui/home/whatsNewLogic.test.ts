// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  markWhatsNewSeen,
  WHATS_NEW_MIN_WORDS,
  WHATS_NEW_VERSION,
  whatsNewDue,
  whatsNewSeen,
} from './whatsNewLogic'

describe('whatsNewLogic', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('whatsNewDue', () => {
    it('returns false when learner has fewer words than minimum threshold', () => {
      expect(whatsNewDue(null, WHATS_NEW_MIN_WORDS - 1)).toBe(false)
      expect(whatsNewDue('older-version', 0)).toBe(false)
    })

    it('returns true when learner has enough words and version has not been seen', () => {
      expect(whatsNewDue(null, WHATS_NEW_MIN_WORDS)).toBe(true)
      expect(whatsNewDue('2026-01-01', WHATS_NEW_MIN_WORDS + 5)).toBe(true)
    })

    it('returns false when current version is already seen', () => {
      expect(whatsNewDue(WHATS_NEW_VERSION, 100)).toBe(false)
    })
  })

  describe('storage', () => {
    it('returns null when nothing has been marked seen', () => {
      expect(whatsNewSeen()).toBeNull()
    })

    it('records and retrieves the seen version', () => {
      markWhatsNewSeen('2026-10-16')
      expect(whatsNewSeen()).toBe('2026-10-16')
    })

    it('defaults to WHATS_NEW_VERSION when no argument is passed to markWhatsNewSeen', () => {
      markWhatsNewSeen()
      expect(whatsNewSeen()).toBe(WHATS_NEW_VERSION)
    })
  })
})
