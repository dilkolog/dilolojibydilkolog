import { describe, expect, it } from 'vitest'
import { dayPart, greetingFor } from './dayPart'

const at = (h: number, m = 0) => new Date(2026, 5, 1, h, m)

describe('day cycle', () => {
  it('names the part of the day by the clock, same hours as the garden sky', () => {
    expect([at(4, 59), at(5, 30), at(7, 59), at(8), at(16, 59), at(17), at(20, 29), at(20, 30), at(0)].map(dayPart)).toEqual(['night', 'dawn', 'dawn', 'day', 'day', 'dusk', 'dusk', 'night', 'night'])
  })
  it('greets by the hour', () => {
    expect([at(5), at(11, 59), at(12), at(17, 59), at(18), at(22, 59), at(23), at(3)].map(greetingFor)).toEqual(['Günaydın', 'Günaydın', 'İyi günler', 'İyi günler', 'İyi akşamlar', 'İyi akşamlar', 'İyi geceler', 'İyi geceler'])
  })
})
