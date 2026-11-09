import { beforeEach, describe, expect, it } from 'vitest'
import { clock, forgetPosition, resumeAt, savedPosition, savePosition } from './audioResume'

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as Storage
})

describe('resumeAt', () => {
  it('goes back a little before the spot, and ignores the very start and the very end', () => {
    expect(resumeAt(300, 660)).toBe(298)
    expect(resumeAt(5, 660)).toBeNull()
    expect(resumeAt(null, 660)).toBeNull()
    expect(resumeAt(655, 660)).toBeNull()
    expect(resumeAt(300, NaN)).toBe(298)
  })
})

describe('kept positions', () => {
  it('are kept per text, as whole seconds, and let go', () => {
    savePosition('fr-daudet-cornille', 123.7)
    savePosition('other', 50)
    expect(savedPosition('fr-daudet-cornille')).toBe(123)
    expect(savedPosition('other')).toBe(50)
    forgetPosition('fr-daudet-cornille')
    expect(savedPosition('fr-daudet-cornille')).toBeNull()
    expect(savedPosition('other')).toBe(50)
  })

  it('do not keep the first seconds, and survive no storage', () => {
    savePosition('x', 3)
    expect(savedPosition('x')).toBeNull()
    ;(globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => savePosition('x', 50)).not.toThrow()
    expect(savedPosition('x')).toBeNull()
    expect(() => forgetPosition('x')).not.toThrow()
  })
})

describe('clock', () => {
  it('writes minutes and seconds', () => {
    expect(clock(298)).toBe('4:58')
    expect(clock(61)).toBe('1:01')
  })
})
