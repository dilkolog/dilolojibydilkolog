// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { markBadgesSeen, newBadgeIds, seenBadges } from './badgeSeen'

beforeEach(() => localStorage.clear())

describe('badges seen', () => {
  it('takes everything earned so far as seen the first time, so no one is met by a pile', () => {
    expect(seenBadges()).toBeNull()
    expect(newBadgeIds(['a', 'b'])).toEqual([])
    expect([...seenBadges()!]).toEqual(['a', 'b'])
  })

  it('then offers only what was earned since, once', () => {
    newBadgeIds(['a'])
    expect(newBadgeIds(['a', 'b', 'c'])).toEqual(['b', 'c'])
    markBadgesSeen(['b'])
    expect(newBadgeIds(['a', 'b', 'c'])).toEqual(['c'])
    markBadgesSeen(['c'])
    expect(newBadgeIds(['a', 'b', 'c'])).toEqual([])
  })

  it('survives a damaged record', () => {
    localStorage.setItem('kelime-koc:badges-seen', '{not json')
    expect(seenBadges()).toBeNull()
    localStorage.setItem('kelime-koc:badges-seen', '"text"')
    expect([...seenBadges()!]).toEqual([])
  })
})
