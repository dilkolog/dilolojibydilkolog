import { describe, expect, it } from 'vitest'
import { cardSvg } from './ProgressCard'

describe('progress card', () => {
  it('renders the numbers into a standalone SVG and escapes the name', () => {
    const svg = cardSvg({ name: 'Ali <3', language: 'fr', streak: 12, level: 4, title: 'Kaşif', xp: 1234, words: 80, flowers: 9, growing: 40, vocab: 7800, weekXp: 310, badges: 6 })
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('Ali &lt;3')
    expect(svg).toContain('>12<')
    expect(svg).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(svg).toContain('#c6317c')   // the app's French colour (DESIGN.md --fr)
    expect(svg).not.toContain('var(--')
  })

  const data = { name: 'Ali', language: 'fr' as const, streak: 12, level: 4, title: 'Kaşif', xp: 1234, words: 80, flowers: 9, growing: 40, weekXp: 310, badges: 6 }

  it('shows only the numbers chosen, and the extra lines when there are any', () => {
    const svg = cardSvg({ ...data, goal: 'Hedef B2 · 40 gün kaldı', interests: ['Seyahat', 'Müzik'], pinned: ['İlk adım', 'Bir hafta'] }, { stats: ['streak', 'badges'] })
    expect(svg).toContain('>12<')
    expect(svg).toContain('günlük seri')
    expect(svg).toContain('rozet<')
    expect(svg).not.toContain('toplam XP')
    expect(svg).not.toContain('bu hafta XP')
    expect(svg).toContain('Hedef B2 · 40 gün kaldı')
    expect(svg).toContain('Seyahat · Müzik')
    expect(svg).toContain('Rozetlerim: İlk adım · Bir hafta')
    // No goal, interests or pins: none of those lines.
    const plain = cardSvg(data)
    expect(plain).not.toContain('Hedef')
    expect(plain).not.toContain('Rozetlerim')
  })

  it('draws in the colours chosen', () => {
    expect(cardSvg(data, { theme: 'light' })).toContain('fill="#0f172a"')
    const banner = cardSvg(data, { theme: 'banner', colors: ['#fb923c', '#fde047'] })
    expect(banner).toContain('stop-color="#fb923c"')
    expect(banner).toContain('stop-color="#fde047"')
    expect(banner).toContain('fill-opacity')
    // The accent text is not the colour of the background it sits on.
    expect(banner).not.toContain('fill="#fb923c">Fransızca')
    expect(banner).toContain('fill="#ffffff">Fransızca')
    expect(banner).not.toContain('var(--')
    expect(banner).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})
