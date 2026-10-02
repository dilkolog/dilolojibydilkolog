import { describe, expect, it } from 'vitest'
import { cardSvg } from './ProgressCard'

describe('progress card', () => {
  it('renders the numbers into a standalone SVG and escapes the name', () => {
    const svg = cardSvg({ name: 'Ali <3', language: 'fr', streak: 12, level: 4, title: 'Kaşif', xp: 1234, words: 80, flowers: 9, growing: 40, vocab: 7800, weekXp: 310, badges: 6 })
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('Ali &lt;3')
    expect(svg).toContain('🔥 12')
    expect(svg).toContain('#ec4899')
    expect(svg).not.toContain('var(--')
  })
})
