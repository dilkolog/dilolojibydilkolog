import { describe, expect, it } from 'vitest'
import type { SentenceCard } from '../sentences'
import { forecastTotals, sentenceForecast } from '../sentenceForecast'

const NOW = new Date(2026, 9, 20, 10)
const card = (due: Date, language: SentenceCard['language'] = 'fr'): SentenceCard =>
  ({ id: String(Math.random()), language, text: 'x', translation: '', addedAt: NOW.toISOString(), card: { due } }) as unknown as SentenceCard
const inDays = (n: number, hour = 12) => new Date(2026, 9, 20 + n, hour)

describe('sentenceForecast', () => {
  it('counts what is late or due today for today, and the rest by the day it falls due', () => {
    const days = sentenceForecast([card(inDays(-5)), card(inDays(0, 8)), card(inDays(0, 23)), card(inDays(1)), card(inDays(3)), card(inDays(3, 1))], 'fr', NOW)
    expect(days.map((d) => d.count)).toEqual([3, 1, 0, 2, 0, 0, 0])
    expect(days[0].day).toBe('2026-10-20')
    expect(days[6].day).toBe('2026-10-26')
  })

  it('leaves out other languages and cards past the window', () => {
    const days = sentenceForecast([card(inDays(2), 'es'), card(inDays(9)), card(inDays(2))], 'fr', NOW)
    expect(forecastTotals(days)).toEqual({ total: 1, peak: 1 })
  })

  it('does not break on a damaged date', () => {
    const days = sentenceForecast([card(new Date('nope'))], 'fr', NOW)
    expect(forecastTotals(days).total).toBe(0)
  })

  it('works across a month end', () => {
    const days = sentenceForecast([card(new Date(2026, 10, 2))], 'fr', new Date(2026, 9, 30, 9))
    expect(days.map((d) => d.day)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'])
    expect(days[3].count).toBe(1)
  })
})
