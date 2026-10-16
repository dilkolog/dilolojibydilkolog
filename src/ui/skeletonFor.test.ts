import { describe, expect, it } from 'vitest'
import { skeletonFor } from './skeletonFor'

describe('skeletonFor', () => {
  it('returns home for home screen', () => {
    expect(skeletonFor('home')).toBe('home')
  })

  it('returns list for list screens (words, mistakes, dictionary)', () => {
    expect(skeletonFor('words')).toBe('list')
    expect(skeletonFor('mistakes')).toBe('list')
    expect(skeletonFor('dictionary')).toBe('list')
  })

  it('returns detail for word detail screen', () => {
    expect(skeletonFor('word')).toBe('detail')
  })

  it('returns settings for settings screen', () => {
    expect(skeletonFor('settings')).toBe('settings')
  })

  it('returns session for session and summary screens', () => {
    expect(skeletonFor('session')).toBe('session')
    expect(skeletonFor('summary')).toBe('session')
  })

  it('defaults to grid for unknown screens (games, reader, etc.)', () => {
    expect(skeletonFor('games')).toBe('grid')
    expect(skeletonFor('reading')).toBe('grid')
    expect(skeletonFor('profile')).toBe('grid')
    expect(skeletonFor('unknown_screen')).toBe('grid')
  })
})
