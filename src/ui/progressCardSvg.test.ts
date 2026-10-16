import { describe, expect, it } from 'vitest'
import { cardSvg, type CardData } from './progressCardSvg'

const baseData: CardData = {
  name: 'Ahmet',
  language: 'fr',
  streak: 15,
  level: 4,
  title: 'Kelime Gezgini',
  xp: 1250,
  words: 120,
  flowers: 8,
  growing: 14,
  weekXp: 350,
  badges: 5,
}

describe('progressCardSvg', () => {
  it('generates valid SVG markup with dimensions 1080x1350', () => {
    const svg = cardSvg(baseData)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg).toContain('width="1080"')
    expect(svg).toContain('height="1350"')
    expect(svg).toContain('viewBox="0 0 1080 1350"')
  })

  it('renders learner details, title, level, and stats', () => {
    const svg = cardSvg(baseData)
    expect(svg).toContain('Ahmet')
    expect(svg).toContain('Fransızca · Seviye 4 · Kelime Gezgini')
    expect(svg).toContain('günlük seri')
    expect(svg).toContain('bu hafta XP')
    expect(svg).toContain('toplam XP')
  })

  it('escapes dangerous XML characters in name and text', () => {
    const dangerous: CardData = {
      ...baseData,
      name: '<Script> & "Alert"',
      title: 'Expert <A2>',
    }
    const svg = cardSvg(dangerous)
    expect(svg).not.toContain('<Script>')
    expect(svg).toContain('&lt;Script&gt; &amp; &quot;Alert&quot;')
    expect(svg).toContain('Expert &lt;A2&gt;')
  })

  it('supports light and banner themes', () => {
    const lightSvg = cardSvg(baseData, { theme: 'light' })
    expect(lightSvg).toContain('stop-color="#f8fafc"') // light top palette

    const bannerSvg = cardSvg(baseData, { theme: 'banner', colors: ['#ff0000', '#0000ff'] })
    expect(bannerSvg).toContain('fill="#0f172a" fill-opacity="0.55"') // veil
    expect(bannerSvg).toContain('#ff0000')
    expect(bannerSvg).toContain('#0000ff')
  })

  it('renders goal, interests, and pinned badges when present', () => {
    const richData: CardData = {
      ...baseData,
      goal: 'Hedef B2 · 90 gün kaldı',
      interests: ['edebiyat', 'tarih'],
      pinned: ['İlk Adım', 'Hızlı Ezber'],
    }
    const svg = cardSvg(richData)
    expect(svg).toContain('Hedef B2 · 90 gün kaldı')
    expect(svg).toContain('edebiyat · tarih')
    expect(svg).toContain('Rozetlerim: İlk Adım · Hızlı Ezber')
  })
})
