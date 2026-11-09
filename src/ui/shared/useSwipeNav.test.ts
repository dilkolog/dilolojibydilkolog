import { describe, expect, it } from 'vitest'
import { swipeDirection } from './useSwipeNav'

describe('a sideways swipe between words', () => {
  it('left is next, right is previous', () => {
    expect(swipeDirection(-120, 10, 250)).toBe('next')
    expect(swipeDirection(110, -8, 300)).toBe('prev')
  })
  it('a short, slow or mostly upright move is not a swipe (a scroll or a tap)', () => {
    expect(swipeDirection(-40, 0, 200)).toBeNull()
    expect(swipeDirection(-150, 10, 1200)).toBeNull()
    expect(swipeDirection(-90, 60, 200)).toBeNull()
    expect(swipeDirection(-90, 48, 200)).toBeNull()
  })
})
