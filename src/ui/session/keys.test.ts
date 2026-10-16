// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { modalOpen, ownsKey } from './keys'

describe('keys', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('modalOpen', () => {
    it('returns false when no modal dialog is present in document', () => {
      expect(modalOpen()).toBe(false)
    })

    it('returns true when an element with aria-modal="true" is in document', () => {
      const dialog = document.createElement('div')
      dialog.setAttribute('aria-modal', 'true')
      document.body.appendChild(dialog)
      expect(modalOpen()).toBe(true)
    })
  })

  describe('ownsKey', () => {
    it('returns true for HTML input, textarea, button, and select elements', () => {
      expect(ownsKey(document.createElement('input'))).toBe(true)
      expect(ownsKey(document.createElement('textarea'))).toBe(true)
      expect(ownsKey(document.createElement('button'))).toBe(true)
      expect(ownsKey(document.createElement('select'))).toBe(true)
    })

    it('returns false for other elements and null targets', () => {
      expect(ownsKey(null)).toBe(false)
      expect(ownsKey(document.createElement('div'))).toBe(false)
      expect(ownsKey(document.createElement('span'))).toBe(false)
      expect(ownsKey(document.createElement('p'))).toBe(false)
    })
  })
})
