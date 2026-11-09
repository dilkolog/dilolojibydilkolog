// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { markLevelSeen, seenLevel } from './levelSeen'

describe('level seen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null on fresh device', () => {
    expect(seenLevel()).toBeNull()
  })

  it('records and retrieves the seen level', () => {
    markLevelSeen(3)
    expect(seenLevel()).toBe(3)
  })

  it('handles invalid stored values gracefully', () => {
    localStorage.setItem('kelime-koc:level-seen', 'not-a-number')
    expect(seenLevel()).toBeNull()
  })
})
